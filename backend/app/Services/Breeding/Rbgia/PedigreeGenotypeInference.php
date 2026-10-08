<?php

namespace App\Services\Breeding\Rbgia;

use App\Models\Bird;
use App\Models\BirdGrandparent;
use App\Models\SplitGene;
use App\Models\VisualMutation;
use App\Support\SplitGeneCatalog;
use App\Support\VisualMutationCatalog;
use Illuminate\Support\Collection;

/**
 * Proven grandparent alleles are written onto the breeding bird.
 * A possible allele keeps its small chance and is mixed into the offspring odds.
 */
class PedigreeGenotypeInference
{
    /**
     * @var array<string, array{side: string, parent: string, sex: string, title: string}>
     */
    private const ROLES = [
        'paternal_grandfather' => ['side' => 'paternal', 'parent' => 'grandfather', 'sex' => Bird::SEX_COCK, 'title' => 'paternal grandfather'],
        'paternal_grandmother' => ['side' => 'paternal', 'parent' => 'grandmother', 'sex' => Bird::SEX_HEN, 'title' => 'paternal grandmother'],
        'maternal_grandfather' => ['side' => 'maternal', 'parent' => 'grandfather', 'sex' => Bird::SEX_COCK, 'title' => 'maternal grandfather'],
        'maternal_grandmother' => ['side' => 'maternal', 'parent' => 'grandmother', 'sex' => Bird::SEX_HEN, 'title' => 'maternal grandmother'],
    ];

    public function __construct(
        private readonly GeneticCodeParser $parser,
    ) {}

    /**
     * @return array{applied: list<array<string, string>>, possible: list<array<string, string>>}
     */
    public function apply(Bird $bird): array
    {
        $applied = [];
        $possible = [];
        $carriers = [];
        $loci = $this->loci($bird);

        foreach ($loci as $locus) {
            $copies = $this->certainCopies($bird, $locus);
            $label = $this->birdLabel($bird);

            if ($copies >= 1) {
                $change = $this->applyCopies($bird, $locus, $copies);
                if ($change !== null) {
                    $applied[] = [
                        'bird_id' => (string) $bird->bird_id,
                        'gene' => $locus['name'],
                        'as' => $change,
                        'message' => $this->appliedMessage($label, $locus, $copies, $change),
                    ];
                }

                continue;
            }

            if ($this->hasLocus($bird->visualMutations, $locus['key'], true) || $this->hasLocus($bird->splitGenes, $locus['key'], false)) {
                continue;
            }

            $chance = $this->carrierChance($bird, $locus);
            if ($chance <= 0.000001) {
                continue;
            }

            $passes = $this->passChance($bird, $locus, $chance);
            $carriers[] = [
                'key' => $locus['key'],
                'name' => $locus['name'],
                'inheritance' => $locus['inheritance'],
                'sex_linked' => $locus['sex_linked'],
                'mutant' => $locus['mutant'],
                'wild' => $locus['wild'],
                'series' => $locus['series'],
                'allele_text' => $locus['allele_text'],
                'chance' => $chance,
                'passes' => $passes,
            ];
            $possible[] = [
                'bird_id' => (string) $bird->bird_id,
                'gene' => $locus['name'],
                'as' => 'possible',
                'chance' => $this->probabilityFraction($chance),
                'passes' => $this->probabilityFraction($passes),
                'message' => $label.' has a '.$this->probabilityFraction($chance).' chance of carrying '.$locus['name'].'. '.$this->sourcePhrase($locus).' Offspring odds include that chance: this bird passes the gene '.$this->probabilityFraction($passes).' of the time.',
            ];
        }

        $bird->setAttribute('pedigree_carriers', $carriers);

        return ['applied' => $applied, 'possible' => $possible];
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function carrierChance(Bird $bird, array $locus): float
    {
        $sexLinked = (bool) $locus['sex_linked'];
        if ($sexLinked && $bird->sex === Bird::SEX_HEN) {
            return $this->alleleChance($locus, 'paternal', true);
        }

        $fromFather = $this->alleleChance($locus, 'paternal', $sexLinked);
        $fromMother = $sexLinked
            ? $this->maternalSexLinkedSonChance($locus)
            : $this->alleleChance($locus, 'maternal', false);
        $visual = $fromFather * $fromMother;
        $hidden = ($fromFather * (1 - $fromMother)) + ((1 - $fromFather) * $fromMother);
        $remaining = 1 - $visual;

        return $remaining > 0.000001 ? $hidden / $remaining : 0.0;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function passChance(Bird $bird, array $locus, float $chance): float
    {
        if ($locus['sex_linked'] && $bird->sex === Bird::SEX_HEN) {
            return $chance;
        }

        return $chance / 2;
    }

    /**
     * Probability that the parent on this side passes the mutant allele onward.
     * A grandparent who was not recorded contributes no mutant allele.
     *
     * @param  array<string, mixed>  $locus
     */
    private function alleleChance(array $locus, string $side, bool $sexLinked): float
    {
        $grandfather = $locus[$side]['grandfather'] ?? null;
        $grandmother = $locus[$side]['grandmother'] ?? null;
        $fromGrandfather = is_array($grandfather)
            ? (float) ($sexLinked ? $grandfather['pass_any'] : $grandfather['pass_any'])
            : 0.0;
        $fromGrandmother = is_array($grandmother)
            ? (float) ($sexLinked ? $grandmother['pass_sons'] : $grandmother['pass_any'])
            : 0.0;

        return ($fromGrandfather + $fromGrandmother) / 2;
    }

    /**
     * A son receives his mother's single Z, which came from the maternal grandfather.
     *
     * @param  array<string, mixed>  $locus
     */
    private function maternalSexLinkedSonChance(array $locus): float
    {
        $grandfather = $locus['maternal']['grandfather'] ?? null;

        return is_array($grandfather) ? (float) $grandfather['pass_any'] : 0.0;
    }

    private function probabilityFraction(float $probability): string
    {
        foreach ([1, 2, 4, 8, 16, 32, 64] as $total) {
            $count = (int) round($probability * $total);
            if (abs($probability - ($count / $total)) < 1e-9) {
                $divisor = $this->gcd($count, $total);

                return ($count / $divisor).'/'.($total / $divisor);
            }
        }

        return rtrim(rtrim(number_format($probability, 4, '.', ''), '0'), '.');
    }

    private function gcd(int $left, int $right): int
    {
        return $right === 0 ? max($left, 1) : $this->gcd($right, $left % $right);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loci(Bird $bird): array
    {
        $loci = [];
        foreach ($bird->grandparents ?? [] as $grandparent) {
            if (! $grandparent instanceof BirdGrandparent) {
                continue;
            }
            $role = self::ROLES[$grandparent->role] ?? null;
            if ($role === null) {
                continue;
            }
            if (! $grandparent->species_id || ($bird->species_id && (int) $grandparent->species_id !== (int) $bird->species_id)) {
                continue;
            }

            foreach ($this->records($grandparent) as $record) {
                $profile = $this->profile($record['visual'], $record['split'], $role);
                if ($profile === null) {
                    continue;
                }
                $key = $profile['key'];
                if (! isset($loci[$key])) {
                    $loci[$key] = [
                        'key' => $key,
                        'name' => $profile['name'],
                        'inheritance' => $profile['inheritance'],
                        'sex_linked' => $profile['sex_linked'],
                        'mutant' => $profile['mutant'],
                        'wild' => $profile['wild'],
                        'series' => $profile['series'],
                        'allele_text' => $profile['allele_text'],
                        'paternal' => ['grandfather' => null, 'grandmother' => null],
                        'maternal' => ['grandfather' => null, 'grandmother' => null],
                    ];
                }
                $current = $loci[$key][$role['side']][$role['parent']];
                if ($current === null || $profile['pass_any'] > $current['pass_any'] || $profile['pass_sons'] > $current['pass_sons']) {
                    $loci[$key][$role['side']][$role['parent']] = $profile;
                }
            }
        }

        return $loci;
    }

    /**
     * @return list<array{visual: ?VisualMutation, split: ?SplitGene}>
     */
    private function records(BirdGrandparent $grandparent): array
    {
        $rows = [];
        $visuals = $grandparent->visualMutations;
        if ($visuals->isEmpty() && $grandparent->visualMutation) {
            $visuals = collect([$grandparent->visualMutation]);
        }
        foreach ($visuals as $visual) {
            if ($visual instanceof VisualMutation) {
                $rows[] = ['visual' => $visual, 'split' => null];
            }
        }

        $splits = $grandparent->splitGenes;
        if ($splits->isEmpty() && $grandparent->splitGene) {
            $splits = collect([$grandparent->splitGene]);
        }
        foreach ($splits as $split) {
            if ($split instanceof SplitGene) {
                $rows[] = ['visual' => null, 'split' => $split];
            }
        }

        return $rows;
    }

    /**
     * @param  array{side: string, parent: string, sex: string, title: string}  $role
     * @return array<string, mixed>|null
     */
    private function profile(?VisualMutation $visual, ?SplitGene $split, array $role): ?array
    {
        $sexLinked = stripos((string) ($visual->inheritance_type ?? $split->inheritance_type ?? ''), 'Sex-linked') !== false;
        $code = $visual
            ? $this->parser->sexSpecificSegment($visual->genetic_code, $role['sex'])
            : ($sexLinked
                ? $this->parser->sexSpecificSegment($split?->genetic_code, $role['sex'])
                : ($this->parser->parseSegments($split?->genetic_code)[0]['segment'] ?? $split?->genetic_code));
        $alleles = $this->parser->allelePair($code);
        if ($alleles === null) {
            return null;
        }

        $mutants = array_values(array_filter(
            $alleles,
            fn (string $allele) => $allele !== '' && strcasecmp($allele, 'W') !== 0 && ! str_ends_with($allele, '+'),
        ));
        if ($mutants === [] || count(array_unique($mutants)) > 1) {
            return null;
        }

        $mutant = $mutants[0];
        $wild = $split?->wild_type_allele ?: $mutant.'+';
        $hasW = $this->parser->containsW($alleles);
        $homozygous = count($mutants) >= 2 || (count($mutants) === 1 && ! $hasW && ! $this->hasWild($alleles));
        $pass = $homozygous ? 1.0 : 0.5;
        $passSons = $pass;
        $passDaughters = $pass;
        if ($sexLinked && $role['sex'] === Bird::SEX_HEN) {
            $passSons = $mutants !== [] ? 1.0 : 0.0;
            $passDaughters = 0.0;
            $pass = 0.0;
        }

        $name = $visual?->name ?: SplitGeneCatalog::visualName($split);
        $key = $visual
            ? VisualMutationCatalog::locusKey($visual->series, $visual->allele)
            : SplitGeneCatalog::locusKey($split);
        if (! $key) {
            return null;
        }

        return [
            'key' => $key,
            'name' => preg_replace('/^Split\s+/i', '', (string) $name) ?: $name,
            'inheritance' => (string) ($visual->inheritance_type ?? $split->inheritance_type ?? ''),
            'sex_linked' => $sexLinked,
            'mutant' => $mutant,
            'wild' => $wild,
            'series' => (string) ($visual->series ?? $split->genetic_category ?? ''),
            'allele_text' => (string) ($visual->allele ?? $split->mutant_allele ?? $mutant),
            'title' => $role['title'],
            'pass_any' => $pass,
            'pass_sons' => $passSons,
            'pass_daughters' => $passDaughters,
            'visual' => $visual,
            'split' => $split,
            'shown' => $visual ? 'visual '.$name : (string) $split?->name,
        ];
    }

    /**
     * @param  array{0: string, 1: string}  $alleles
     */
    private function hasWild(array $alleles): bool
    {
        foreach ($alleles as $allele) {
            if (str_ends_with($allele, '+')) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function certainCopies(Bird $bird, array $locus): int
    {
        return $this->certainFromSide($bird, $locus, 'paternal')
            + $this->certainFromSide($bird, $locus, 'maternal');
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function certainFromSide(Bird $bird, array $locus, string $side): int
    {
        $grandfather = $locus[$side]['grandfather'];
        $grandmother = $locus[$side]['grandmother'];
        $sexLinked = (bool) $locus['sex_linked'];

        if (! $sexLinked) {
            $fromGrandfather = is_array($grandfather) && (float) $grandfather['pass_any'] === 1.0;
            $fromGrandmother = is_array($grandmother) && (float) $grandmother['pass_any'] === 1.0;

            return ($fromGrandfather && $fromGrandmother) ? 1 : 0;
        }

        if ($side === 'paternal') {
            $fromGrandfather = is_array($grandfather) && (float) $grandfather['pass_any'] === 1.0;
            $fromGrandmother = is_array($grandmother) && (float) $grandmother['pass_sons'] === 1.0;

            return ($fromGrandfather && $fromGrandmother) ? 1 : 0;
        }

        $motherCertain = is_array($grandfather) && (float) $grandfather['pass_any'] === 1.0;

        return ($motherCertain && $bird->sex === Bird::SEX_COCK) ? 1 : 0;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function canReach(Bird $bird, array $locus): bool
    {
        foreach (['paternal', 'maternal'] as $side) {
            $grandfather = $locus[$side]['grandfather'];
            $grandmother = $locus[$side]['grandmother'];
            if (! $locus['sex_linked']) {
                if ($this->passes($grandfather, 'pass_any') || $this->passes($grandmother, 'pass_any')) {
                    return true;
                }

                continue;
            }

            if ($side === 'paternal' && ($this->passes($grandfather, 'pass_any') || $this->passes($grandmother, 'pass_sons'))) {
                return true;
            }

            if ($side === 'maternal' && $bird->sex === Bird::SEX_COCK && $this->passes($grandfather, 'pass_any')) {
                return true;
            }
        }

        return false;
    }

    private function passes(mixed $profile, string $key): bool
    {
        return is_array($profile) && (float) ($profile[$key] ?? 0) > 0;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function applyCopies(Bird $bird, array $locus, int $copies): ?string
    {
        $recessive = str_contains(strtolower((string) $locus['inheritance']), 'recessive');
        $asVisual = ! $recessive || $copies >= 2 || ($locus['sex_linked'] && $bird->sex === Bird::SEX_HEN);
        $alreadyVisual = $this->hasLocus($bird->visualMutations, $locus['key'], true);
        $alreadySplit = $this->hasLocus($bird->splitGenes, $locus['key'], false);

        if ($asVisual) {
            if ($alreadyVisual) {
                return null;
            }
            $this->removeLocus($bird, 'splitGenes', $locus['key'], false);
            $visuals = $bird->visualMutations instanceof Collection ? $bird->visualMutations : collect();
            $bird->setRelation('visualMutations', $visuals->push($this->visualRecord($bird, $locus, $copies))->values());

            return 'visual';
        }

        if ($alreadyVisual || $alreadySplit) {
            return null;
        }

        $splits = $bird->splitGenes instanceof Collection ? $bird->splitGenes : collect();
        $bird->setRelation('splitGenes', $splits->push($this->splitRecord($bird, $locus))->values());

        return 'split';
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function visualRecord(Bird $bird, array $locus, int $copies): VisualMutation
    {
        $wantedRank = $copies >= 2 ? 2 : 1;
        if ($bird->species_id) {
            $match = VisualMutationCatalog::forSpecies((int) $bird->species_id)->first(function ($mutation) use ($locus, $wantedRank, $copies) {
                if (VisualMutationCatalog::locusKey($mutation->series, $mutation->allele) !== $locus['key']) {
                    return false;
                }
                $rank = VisualMutationCatalog::dosageRank($mutation->allele);
                if ($rank !== null) {
                    return $rank === $wantedRank;
                }

                return $copies >= 2;
            });
            if ($match instanceof VisualMutation) {
                return $match;
            }
        }

        $singleName = (string) preg_replace('/^Double\s+/i', '', (string) $locus['name']);
        $name = ($copies >= 2 && ! str_contains(strtolower((string) $locus['inheritance']), 'recessive'))
            ? (str_starts_with(strtolower((string) $locus['name']), 'double ') ? $locus['name'] : 'Double '.$singleName)
            : ($copies >= 2 ? $locus['name'] : $singleName);
        $code = $copies >= 2
            ? $this->parser->pairLabel($locus['mutant'], $locus['mutant'])
            : ($locus['sex_linked'] && $bird->sex === Bird::SEX_HEN
                ? $locus['mutant'].'/W'
                : $this->parser->pairLabel($locus['wild'], $locus['mutant']));
        if ($locus['sex_linked'] && $copies >= 2) {
            $code = $this->parser->pairLabel($locus['mutant'], $locus['mutant']).'|'.$locus['mutant'].'/W';
        }

        $mutation = new VisualMutation;
        $mutation->forceFill([
            'name' => $name,
            'series' => $locus['series'],
            'allele' => $locus['allele_text'],
            'genetic_code' => $code,
            'inheritance_type' => $locus['inheritance'],
            'verification_status' => 'Verified',
        ]);

        return $mutation;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function splitRecord(Bird $bird, array $locus): SplitGene
    {
        if ($bird->species_id) {
            $match = SplitGeneCatalog::forSpecies((int) $bird->species_id)->first(
                fn ($gene) => SplitGeneCatalog::locusKey($gene) === $locus['key'],
            );
            if ($match instanceof SplitGene) {
                return $match;
            }
        }

        foreach (['paternal', 'maternal'] as $side) {
            foreach (['grandfather', 'grandmother'] as $parent) {
                $split = $locus[$side][$parent]['split'] ?? null;
                if ($split instanceof SplitGene) {
                    return $split;
                }
            }
        }

        $code = $this->parser->pairLabel($locus['wild'], $locus['mutant']);
        $gene = new SplitGene;
        $gene->forceFill([
            'name' => 'Split '.$locus['name'],
            'genetic_category' => $locus['series'],
            'mutant_allele' => $locus['mutant'],
            'wild_type_allele' => $locus['wild'],
            'genetic_symbol' => $locus['mutant'],
            'genetic_code' => $code,
            'heterozygous_genotype' => $code,
            'inheritance_type' => $locus['inheritance'],
            'phenotype_when_visual' => $locus['name'],
            'cock_can_split' => true,
            'hen_can_split' => ! $locus['sex_linked'],
            'verification_status' => 'Verified',
        ]);

        return $gene;
    }

    private function hasLocus(mixed $records, string $key, bool $visual): bool
    {
        foreach ($records instanceof Collection ? $records : [] as $record) {
            $locus = $visual
                ? VisualMutationCatalog::locusKey($record->series ?? null, $record->allele ?? null)
                : SplitGeneCatalog::locusKey($record);
            if ($locus === $key) {
                return true;
            }
        }

        return false;
    }

    private function removeLocus(Bird $bird, string $relation, string $key, bool $visual): void
    {
        $records = $bird->{$relation};
        if (! $records instanceof Collection) {
            return;
        }

        $bird->setRelation($relation, $records->reject(function ($record) use ($key, $visual) {
            $locus = $visual
                ? VisualMutationCatalog::locusKey($record->series ?? null, $record->allele ?? null)
                : SplitGeneCatalog::locusKey($record);

            return $locus === $key;
        })->values());
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function sourcePhrase(array $locus): string
    {
        $parts = [];
        foreach (['paternal', 'maternal'] as $side) {
            foreach (['grandfather', 'grandmother'] as $parent) {
                $profile = $locus[$side][$parent];
                if (is_array($profile)) {
                    $parts[] = 'The '.$profile['title'].' is '.$profile['shown'];
                }
            }
        }

        return $parts === [] ? 'A grandparent carries this gene.' : implode('. ', $parts).'.';
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function appliedMessage(string $label, array $locus, int $copies, string $as): string
    {
        $how = $as === 'split' ? 'a hidden split' : 'a visible gene';
        $path = $copies >= 2
            ? 'Both sides of the pedigree pass '.$locus['name'].' with certainty.'
            : $this->certainPathPhrase($locus);

        return $label.' carries '.$locus['name'].' as '.$how.'. '.$path.' This calculation uses that genotype.';
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function certainPathPhrase(array $locus): string
    {
        if (! $locus['sex_linked'] && $this->autosomalSideCertain($locus, 'paternal')) {
            return 'Both paternal grandparents pass '.$locus['name'].', so the father passes it to every chick.';
        }

        if (! $locus['sex_linked'] && $this->autosomalSideCertain($locus, 'maternal')) {
            return 'Both maternal grandparents pass '.$locus['name'].', so the mother passes it to every chick.';
        }

        if ($locus['sex_linked'] && $this->paternalSexLinkedCertain($locus)) {
            return 'Both paternal grandparents pass '.$locus['name'].' on the Z chromosome, so the father passes it to every chick.';
        }

        if ($locus['sex_linked'] && is_array($locus['maternal']['grandfather'] ?? null) && (float) $locus['maternal']['grandfather']['pass_any'] === 1.0) {
            return 'The maternal grandfather passes his Z chromosome to his daughter, and she passes that chromosome to her sons.';
        }

        return 'The grandparents make this inheritance certain.';
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function autosomalSideCertain(array $locus, string $side): bool
    {
        $grandfather = $locus[$side]['grandfather'] ?? null;
        $grandmother = $locus[$side]['grandmother'] ?? null;

        return is_array($grandfather) && (float) $grandfather['pass_any'] === 1.0
            && is_array($grandmother) && (float) $grandmother['pass_any'] === 1.0;
    }

    /**
     * @param  array<string, mixed>  $locus
     */
    private function paternalSexLinkedCertain(array $locus): bool
    {
        $grandfather = $locus['paternal']['grandfather'] ?? null;
        $grandmother = $locus['paternal']['grandmother'] ?? null;

        return is_array($grandfather) && (float) $grandfather['pass_any'] === 1.0
            && is_array($grandmother) && (float) $grandmother['pass_sons'] === 1.0;
    }

    private function birdLabel(Bird $bird): string
    {
        $sex = $bird->sex === Bird::SEX_HEN ? 'Hen' : 'Cock';
        $id = trim((string) $bird->bird_id);

        return $id !== '' ? $sex.' '.$id : $sex;
    }
}
