<?php

namespace Tests\Unit;

use App\Models\Bird;
use App\Models\BirdGrandparent;
use App\Models\SplitGene;
use App\Models\VisualMutation;
use App\Services\Breeding\Rbgia\GeneticCodeParser;
use App\Services\Breeding\Rbgia\LocusPunnett;
use App\Services\Breeding\Rbgia\PedigreeGenotypeInference;
use Illuminate\Support\Collection;
use Tests\TestCase;

class PedigreeGenotypeInferenceTest extends TestCase
{
    private PedigreeGenotypeInference $pedigree;

    protected function setUp(): void
    {
        parent::setUp();
        $this->pedigree = new PedigreeGenotypeInference(new GeneticCodeParser);
    }

    public function test_both_paternal_grandparents_visual_make_an_obligate_split(): void
    {
        $bird = $this->bird(Bird::SEX_COCK, '44444', [
            $this->grandparent('paternal_grandfather', [$this->visual('Pale Fallow', 'Fallow', 'pf. Autosomal.', 'pf/pf', 'Autosomal recessive')]),
            $this->grandparent('paternal_grandmother', [$this->visual('Pale Fallow', 'Fallow', 'pf. Autosomal.', 'pf/pf', 'Autosomal recessive')]),
        ]);

        $result = $this->pedigree->apply($bird);

        $this->assertCount(1, $result['applied']);
        $this->assertSame('split', $result['applied'][0]['as']);
        $this->assertSame([], $result['possible']);
        $this->assertSame('Split Pale Fallow', $bird->splitGenes->first()->name);
        $this->assertSame('pf+/pf', $bird->splitGenes->first()->genetic_code);
    }

    public function test_one_visual_grandparent_stays_possible_and_does_not_change_the_square(): void
    {
        $bird = $this->bird(Bird::SEX_COCK, '44444', [
            $this->grandparent('paternal_grandfather', [$this->visual('Pale Fallow', 'Fallow', 'pf. Autosomal.', 'pf/pf', 'Autosomal recessive')]),
        ]);

        $result = $this->pedigree->apply($bird);

        $this->assertSame([], $result['applied']);
        $this->assertCount(1, $result['possible']);
        $this->assertSame('1/2', $result['possible'][0]['chance']);
        $this->assertSame('1/4', $result['possible'][0]['passes']);
        $this->assertTrue($bird->splitGenes->isEmpty());
        $this->assertStringContainsString('Offspring odds include that chance', $result['possible'][0]['message']);
    }

    public function test_a_possible_carrier_passes_the_gene_on_only_part_of_the_offspring(): void
    {
        $punnett = new LocusPunnett(new GeneticCodeParser);
        $rows = $punnett->crossWeighted(
            ['pf+' => 0.75, 'pf' => 0.25],
            ['pf' => 1.0],
            false,
            'Autosomal recessive',
        );
        $byGenotype = [];
        foreach ($rows as $row) {
            $byGenotype[$row['genotype']] = $row;
        }

        $this->assertEqualsWithDelta(0.25, $byGenotype['pf/pf']['probability'], 0.0001);
        $this->assertSame('visual', $byGenotype['pf/pf']['expression']);
        $this->assertEqualsWithDelta(0.75, $byGenotype['pf+/pf']['probability'], 0.0001);
        $this->assertSame('carrier_split', $byGenotype['pf+/pf']['expression']);
    }

    public function test_homozygous_maternal_grandfather_makes_a_cock_an_obligate_opaline_split(): void
    {
        $bird = $this->bird(Bird::SEX_COCK, '44444', [
            $this->grandparent('maternal_grandfather', [$this->visual('Opaline', 'Sex-linked', 'op. Distribution mutation.', 'op/op|op/W', 'Sex-linked recessive')]),
        ]);

        $result = $this->pedigree->apply($bird);

        $this->assertSame('split', $result['applied'][0]['as']);
        $this->assertSame('op+/op', $bird->splitGenes->first()->genetic_code);
    }

    public function test_maternal_grandfather_opaline_does_not_reach_a_hen(): void
    {
        $bird = $this->bird(Bird::SEX_HEN, '233344', [
            $this->grandparent('maternal_grandfather', [$this->visual('Opaline', 'Sex-linked', 'op. Distribution mutation.', 'op/op|op/W', 'Sex-linked recessive')]),
        ]);

        $result = $this->pedigree->apply($bird);

        $this->assertSame([], $result['applied']);
        $this->assertSame([], $result['possible']);
        $this->assertTrue($bird->visualMutations->isEmpty());
        $this->assertTrue($bird->splitGenes->isEmpty());
    }

    public function test_both_paternal_grandparents_make_a_hen_visual_opaline(): void
    {
        $bird = $this->bird(Bird::SEX_HEN, '233344', [
            $this->grandparent('paternal_grandfather', [$this->visual('Opaline', 'Sex-linked', 'op. Distribution mutation.', 'op/op|op/W', 'Sex-linked recessive')]),
            $this->grandparent('paternal_grandmother', [$this->visual('Opaline', 'Sex-linked', 'op. Distribution mutation.', 'op/W', 'Sex-linked recessive')]),
        ]);

        $result = $this->pedigree->apply($bird);

        $this->assertSame('visual', $result['applied'][0]['as']);
        $this->assertSame('op/W', $bird->visualMutations->first()->genetic_code);
    }

    public function test_a_stored_split_is_not_added_again(): void
    {
        $split = new SplitGene;
        $split->forceFill([
            'name' => 'Split Pale Fallow',
            'genetic_category' => 'Fallow',
            'mutant_allele' => 'pf',
            'wild_type_allele' => 'pf+',
            'genetic_symbol' => 'pf',
            'genetic_code' => 'pf+/pf',
            'inheritance_type' => 'Autosomal recessive',
            'phenotype_when_visual' => 'Pale Fallow',
        ]);
        $bird = $this->bird(Bird::SEX_COCK, '44444', [
            $this->grandparent('paternal_grandfather', [$this->visual('Pale Fallow', 'Fallow', 'pf. Autosomal.', 'pf/pf', 'Autosomal recessive')]),
            $this->grandparent('paternal_grandmother', [$this->visual('Pale Fallow', 'Fallow', 'pf. Autosomal.', 'pf/pf', 'Autosomal recessive')]),
        ]);
        $bird->setRelation('splitGenes', collect([$split]));

        $result = $this->pedigree->apply($bird);

        $this->assertSame([], $result['applied']);
        $this->assertCount(1, $bird->splitGenes);
    }

    /**
     * @param  list<BirdGrandparent>  $grandparents
     */
    private function bird(string $sex, string $id, array $grandparents): Bird
    {
        $bird = new Bird;
        $bird->forceFill([
            'bird_id' => $id,
            'sex' => $sex,
        ]);
        $bird->setRelation('visualMutations', collect());
        $bird->setRelation('splitGenes', collect());
        $bird->setRelation('grandparents', new Collection($grandparents));

        return $bird;
    }

    /**
     * @param  list<VisualMutation>  $visuals
     * @param  list<SplitGene>  $splits
     */
    private function grandparent(string $role, array $visuals = [], array $splits = []): BirdGrandparent
    {
        $grandparent = new BirdGrandparent;
        $grandparent->forceFill([
            'role' => $role,
            'species_id' => 1,
        ]);
        $grandparent->setRelation('visualMutations', collect($visuals));
        $grandparent->setRelation('visualMutation', $visuals[0] ?? null);
        $grandparent->setRelation('splitGenes', collect($splits));
        $grandparent->setRelation('splitGene', $splits[0] ?? null);

        return $grandparent;
    }

    private function visual(string $name, string $series, string $allele, string $code, string $inheritance): VisualMutation
    {
        $mutation = new VisualMutation;
        $mutation->forceFill([
            'name' => $name,
            'series' => $series,
            'allele' => $allele,
            'genetic_code' => $code,
            'inheritance_type' => $inheritance,
        ]);

        return $mutation;
    }
}
