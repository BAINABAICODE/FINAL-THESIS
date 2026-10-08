<?php

namespace Tests\Unit;

use App\Models\SpeciesBreedingCompatibility;
use App\Services\Breeding\Rbgia\GeneticCodeParser;
use App\Services\Breeding\Rbgia\LocusPunnett;
use App\Support\BaseColorDataset;
use App\Support\SpeciesPairClassifier;
use App\Support\SplitGeneDataset;
use App\Support\VisualMutationDataset;
use PHPUnit\Framework\TestCase;

class CatalogDatasetTest extends TestCase
{
    public function test_every_species_has_at_least_one_base_color_with_a_code(): void
    {
        $records = BaseColorDataset::records($this->dataPath('base-colors'));
        $this->assertNotSame([], $records);

        $bySpecies = [];
        foreach ($records as $record) {
            $bySpecies[$record['scientific_name']][] = $record;
        }

        $expected = [
            'Agapornis roseicollis',
            'Agapornis fischeri',
            'Agapornis personatus',
            'Agapornis nigrigenis',
            'Agapornis lilianae',
            'Agapornis taranta',
            'Agapornis pullarius',
            'Agapornis canus',
            'Agapornis swindernianus',
        ];

        foreach ($expected as $species) {
            $this->assertArrayHasKey($species, $bySpecies, "Missing base-color catalog for {$species}");
            $computable = array_values(array_filter(
                $bySpecies[$species],
                fn (array $row) => ($row['computable'] ?? false) && ($row['genetic_code'] ?? null) && $row['genetic_code'] !== 'UNVERIFIED',
            ));
            $this->assertNotSame([], $computable, "{$species} must have at least one computable genetic_code");
        }
    }

    public function test_base_color_codes_follow_published_dark_factor_matrix(): void
    {
        $parser = new GeneticCodeParser;
        $records = BaseColorDataset::records($this->dataPath('base-colors'));
        $bySpecies = [];
        foreach ($records as $record) {
            $bySpecies[$record['scientific_name']][] = $record;
        }

        $wildTypeOnly = [
            'Agapornis pullarius',
            'Agapornis canus',
            'Agapornis swindernianus',
        ];

        foreach ($bySpecies as $species => $rows) {
            $grounds = [];
            foreach ($rows as $row) {
                $segments = $parser->parseSegments($row['genetic_code']);
                $this->assertCount(2, $segments, "{$species} {$row['name']}");
                $ground = $parser->pairLabel($segments[0]['alleles'][0], $segments[0]['alleles'][1]);
                $dark = $parser->pairLabel($segments[1]['alleles'][0], $segments[1]['alleles'][1]);
                $this->assertSame($ground.'|'.$dark, $row['genetic_code'], "{$species} {$row['name']} allele order");
                $grounds[$ground][$dark] = $row['name'];
            }

            if (in_array($species, $wildTypeOnly, true)) {
                $this->assertSame(['bl+/bl+' => ['D+/D+' => 'Green']], $grounds, $species);

                continue;
            }

            foreach ($grounds as $ground => $darks) {
                foreach (['D+/D+', 'D+/D', 'D/D'] as $dark) {
                    $this->assertArrayHasKey($dark, $darks, "{$species} {$ground} is missing {$dark}");
                }
            }
        }

        $rose = array_column($bySpecies['Agapornis roseicollis'], 'name');
        foreach (['Green', 'Dark Green', 'Olive', 'Aqua', 'Dark Aqua', 'Olive Aqua', 'Turquoise', 'Cobalt', 'Mauve', 'Seagreen', 'Dark Seagreen', 'Olive Seagreen'] as $name) {
            $this->assertContains($name, $rose);
        }
        $this->assertNotContains('Blue', $rose);

        $fischer = array_column($bySpecies['Agapornis fischeri'], 'genetic_code', 'name');
        $this->assertSame('bl1/bl2|D+/D+', $fischer['Teal']);
        $this->assertSame('bl1/blaq|D+/D+', $fischer['AquaBlue1']);
        $this->assertSame('bl2/blaq|D+/D+', $fischer['AquaBlue2']);
        $this->assertSame('bl+/bl+|D+/D', $fischer['Dark Green']);
        $this->assertSame('bl+/bl+|D/D', $fischer['Olive']);

        $masked = array_column($bySpecies['Agapornis personatus'], 'genetic_code', 'name');
        $this->assertSame('bl/bltq|D+/D+', $masked['Turquoise Blue']);
        $this->assertSame('bl/bl|D+/D', $masked['Cobalt']);
        $this->assertSame('bl/bl|D/D', $masked['Mauve']);
    }

    public function test_peach_faced_base_colors_carry_scientific_source(): void
    {
        $records = array_values(array_filter(
            BaseColorDataset::records($this->dataPath('base-colors')),
            fn (array $row) => $row['scientific_name'] === 'Agapornis roseicollis',
        ));

        $this->assertNotSame([], $records);
        foreach ($records as $record) {
            $this->assertNotEmpty($record['scientific_source'], $record['name'].' is missing scientific_source');
        }
    }

    public function test_visual_and_split_catalogs_parse_without_inventing_empty_species_rows(): void
    {
        $mutations = VisualMutationDataset::records($this->dataPath('visual-mutations'));
        $splits = SplitGeneDataset::records($this->dataPath('split-genes'));

        $this->assertNotSame([], $mutations);
        $this->assertNotSame([], $splits);

        foreach (array_merge($mutations, $splits) as $record) {
            $this->assertNotEmpty($record['name']);
            $this->assertNotEmpty($record['scientific_name']);
        }
    }

    public function test_species_pair_classifier_covers_all_thirty_six_crosses(): void
    {
        $classifier = new SpeciesPairClassifier;
        $pairs = $classifier->uniquePairs();
        $this->assertCount(36, $pairs);

        $eyeHybrids = 0;
        $unsupported = 0;
        foreach ($pairs as [$left, $right]) {
            $row = $classifier->classify($left, $right);
            if ($row['breeding_type'] === 'eye_ring_hybrid') {
                $eyeHybrids++;
            }
            if ($row['status'] === SpeciesBreedingCompatibility::UNSUPPORTED) {
                $unsupported++;
            }
        }

        $this->assertSame(6, $eyeHybrids);
        $this->assertSame(8, $unsupported);
        $this->assertSame(
            SpeciesBreedingCompatibility::DOCUMENTED_HYBRID,
            $classifier->classify(1, 2)['status'],
        );
        $this->assertSame(
            SpeciesBreedingCompatibility::LIMITED_OR_UNCERTAIN,
            $classifier->classify(1, 6)['status'],
        );
    }

    public function test_gold_standard_cases_match_locus_punnett(): void
    {
        $punnett = new LocusPunnett(new GeneticCodeParser);
        $cases = [
            ['bl+/bl+', 'bl+/bl+', false, 'Wild type', [['bl+/bl+', 'both', 1.0]]],
            ['blaq/blaq', 'bl+/bl+', false, 'Autosomal recessive', [['bl+/blaq', 'both', 1.0]]],
            ['blaq/blaq', 'blaq/blaq', false, 'Autosomal recessive', [['blaq/blaq', 'both', 1.0]]],
            ['D+/D', 'D+/D+', false, 'Incomplete dominant', [['D+/D+', 'both', 0.5], ['D+/D', 'both', 0.5]]],
            ['a*bz/a*bz', 'a+/a+', false, 'Autosomal recessive', [['a+/a*bz', 'both', 1.0]]],
            ['ino+/ino', 'ino+/W', true, 'Sex-linked recessive', [
                ['ino+/ino+', 'cock', 0.25],
                ['ino+/ino', 'cock', 0.25],
                ['ino+/W', 'hen', 0.25],
                ['ino/W', 'hen', 0.25],
            ]],
            ['ino/ino', 'ino+/W', true, 'Sex-linked recessive', [
                ['ino+/ino', 'cock', 0.5],
                ['ino/W', 'hen', 0.5],
            ]],
        ];

        foreach ($cases as [$cockCode, $henCode, $sexLinked, $type, $expected]) {
            $rows = $punnett->cross($this->alleles($cockCode), $this->alleles($henCode), $sexLinked, $type);
            $actual = [];
            foreach ($rows as $row) {
                $actual[$row['genotype'].'|'.$row['sex']] = round((float) $row['probability'], 4);
            }
            foreach ($expected as [$genotype, $sex, $probability]) {
                $key = $genotype.'|'.$sex;
                $this->assertArrayHasKey($key, $actual, "{$cockCode} × {$henCode} missing {$key}");
                $this->assertEqualsWithDelta($probability, $actual[$key], 0.0001, "{$cockCode} × {$henCode} {$key}");
            }
        }
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function alleles(string $code): array
    {
        $parts = array_map('trim', explode('/', $code));
        $this->assertCount(2, $parts);

        return [$parts[0], $parts[1]];
    }

    private function dataPath(string $folder): string
    {
        return dirname(__DIR__, 2).DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'data'.DIRECTORY_SEPARATOR.$folder;
    }
}
