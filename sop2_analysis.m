close all
clc

theme = getPlotTheme();

fprintf('\nSOP 2. Analysis of RBGIA lovebird pair compatibility\n')
fprintf('Research question 2.1 to 2.4\n')
fprintf('RBGIA writes the probabilities. The weighted score reads them and does not change them.\n')
fprintf('================================================================\n')

fprintf('\n2.1 Desirable and undesirable trait inheritance probabilities\n')
fprintf('Formula: P(g) = n(g) / 4 on one autosomal locus.\n')
fprintf('Undesirable = recessive visual phenotype.\n')
fprintf('Carrier = allele preserved, phenotype not shown.\n')
fprintf('Desirable non-visual = carrier + non-carrier.\n\n')

pairName = {'Visual x visual','Visual x carrier','Split x split','Visual x non-carrier'};
cockSet = {[1 1],[1 1],[1 0],[1 1]};
henSet = {[1 1],[1 0],[1 0],[0 0]};
U = zeros(1,4);
C = zeros(1,4);
N = zeros(1,4);

fprintf('%-24s %12s %12s %14s\n', 'Pairing', 'P(visual)', 'P(carrier)', 'P(non-visual)')
for p = 1:4
    nv = 0;
    nc = 0;
    nn = 0;
    for i = 1:2
        for j = 1:2
            m = cockSet{p}(i) + henSet{p}(j);
            if m == 2
                nv = nv + 1;
            elseif m == 1
                nc = nc + 1;
            else
                nn = nn + 1;
            end
        end
    end
    U(p) = nv / 4;
    C(p) = nc / 4;
    N(p) = (nc + nn) / 4;
    fprintf('%-24s %12.2f %12.2f %14.2f\n', pairName{p}, U(p), C(p), N(p))
end

fprintf('\nChapter 4 reading: visual x visual gives undesirable probability 1.00.\n')
fprintf('Split x split gives undesirable probability 0.25 and keeps a carrier at 0.50.\n')
fprintf('Visual x non-carrier gives undesirable probability 0.00 and carriers at 1.00.\n')

figure(1)
ax = axes;
styleAxes(ax, theme);
bar(1:4, [U; C; 1 - U - C]', 'grouped')
ylim([0 1.15])
set(ax, 'XTick', 1:4, 'XTickLabel', pairName)
ylabel('Probability', 'Color', theme.textColor)
title('2.1 Desirable and undesirable probabilities', 'Color', theme.textColor)
legend({'Undesirable visual','Carrier','Non-carrier'}, 'Location', 'northeast', 'TextColor', theme.textColor)
grid on

fprintf('\n2.2 Genetic diversity preservation among predicted offspring\n')
fprintf('Parent score, capped at 10:\n')
fprintf('  different base +4, identical base +1\n')
fprintf('  different visual sets +3, identical visual sets +1\n')
fprintf('  overlapping split sets +3\n')
fprintf('  same species +1, applied after the level is read, then capped\n\n')

highParts = [4 7 10 11 10];
fprintf('High-difference same-species pair\n')
fprintf('  After base = %d, after visuals = %d, after splits = %d\n', highParts(1), highParts(2), highParts(3))
fprintf('  Same-species point raises the total to %d. The cap returns it to %d.\n', highParts(4), highParts(5))
fprintf('  Level is read at %d, before the species point, so the level is HIGH.\n', highParts(3))

lowBefore = 1 + 1 + 1;
lowAfter = min(10, lowBefore + 1);
fprintf('Low-difference same-species pair: identical base +1, identical visuals +1, identical splits +1.\n')
fprintf('  Before the species point = %d, so the level is LOW. After the species point = %d.\n', lowBefore, lowAfter)

fprintf('\nWhat the offspring distribution preserves:\n')
fprintf('  Split x split produces 3 genotypes. P(mutant allele still present) = 0.75.\n')
fprintf('  P(wild-type allele still present) = 0.75. Both alleles remain in the distribution.\n')
fprintf('  Visual x visual produces 1 genotype. P(wild-type allele still present) = 0.00.\n')
fprintf('Chapter 4 reading: the 10-point score measures parental difference.\n')
fprintf('The offspring table shows whether more than one genotype survives. The score does not edit that table.\n')

figure(2)
ax = axes;
styleAxes(ax, theme);
plot(1:5, highParts, '-o', ...
    'LineWidth', 2, ...
    'MarkerSize', 8, ...
    'Color', theme.series(1,:), ...
    'MarkerFaceColor', theme.series(1,:))
hold on
yline(10, '--', 'Cap = 10', 'Color', theme.capColor, 'LineWidth', 1.2)
ylim([0 12])
xlim([0.5 5.5])
set(ax, 'XTick', 1:5, 'XTickLabel', {'Base +4','Visuals +3','Splits +3','Species +1','After cap'})
ylabel('Points', 'Color', theme.textColor)
title('2.2 Genetic diversity score', 'Color', theme.textColor)
grid on
for i = 1:5
    text(i, highParts(i) + 0.35, num2str(highParts(i)), ...
        'HorizontalAlignment', 'center', ...
        'Color', theme.textColor)
end

fprintf('\n2.3 Dominant, recessive, and sex-linked inheritance behavior\n')
fprintf('The same four cells are read by the inheritance type.\n\n')

cock = [1 0];
hen = [1 0];
nDom = 0;
for i = 1:2
    for j = 1:2
        if cock(i) + hen(j) > 0
            nDom = nDom + 1;
        end
    end
end

fprintf('Recessive, split x split: visual = 0.25, carrier = 0.50, non-carrier = 0.25.\n')
fprintf('Complete dominant, heterozygous x heterozygous: visual cells = %d of 4, P(visual) = %.2f.\n', nDom, nDom / 4)
fprintf('There is no split class under complete dominance.\n')

nd = [0 0 0];
for i = 1:2
    for j = 1:2
        k = cock(i) + hen(j);
        nd(k + 1) = nd(k + 1) + 1;
    end
end
fprintf('Dark factor, D/d x D/d: none = %.2f, single = %.2f, double = %.2f.\n', nd(1) / 4, nd(2) / 4, nd(3) / 4)

fprintf('\nSex-linked ZW. Each cock allele has probability (1/2) x (1/2) = 0.25.\n')
zwName = {'Visual cock x wild-type hen','Wild-type cock x visual hen','Split cock x visual hen'};
zwCock = {[1 1],[0 0],[1 0]};
zwHen = [0 1 1];
sonV = zeros(1,3);
sonS = zeros(1,3);
dauV = zeros(1,3);
dauW = zeros(1,3);

for p = 1:3
    for i = 1:2
        z = zwCock{p}(i);
        muts = z + zwHen(p);
        if muts == 2
            sonV(p) = sonV(p) + 0.25;
        elseif muts == 1
            sonS(p) = sonS(p) + 0.25;
        end

        if z == 1
            dauV(p) = dauV(p) + 0.25;
        else
            dauW(p) = dauW(p) + 0.25;
        end
    end

    fprintf('%-32s split sons %.2f, visual sons %.2f, visual daughters %.2f, wild daughters %.2f\n', ...
        zwName{p}, sonS(p), sonV(p), dauV(p), dauW(p))
end

fprintf('Chapter 4 reading: a visual cock and a wild-type hen give split sons 0.50 and visual daughters 0.50.\n')
fprintf('Daughters take Z from the father, so a wild-type cock and a visual hen give wild-type daughters.\n')

p1 = [0.25 0.50 0.25];
p2 = [0.50 0.50];
joint = zeros(1,6);
r = 0;
jsum = 0;
for a = 1:3
    for b = 1:2
        r = r + 1;
        joint(r) = p1(a) * p2(b);
        jsum = jsum + joint(r);
    end
end
fprintf('Joint check, split x split times visual x split: six products sum to %.2f.\n', jsum)
fprintf('P(visual at the first locus) stays %.2f. P(visual at both loci) = %.2f.\n', p1(3), p1(3) * p2(2))

figure(3)
tiledlayout(1,3, 'TileSpacing', 'compact', 'Padding', 'compact')

ax = nexttile;
styleAxes(ax, theme);
bar([0.25 0.50 0.25], 'FaceColor', theme.series(1,:))
ylim([0 1])
set(ax, 'XTickLabel', {'Visual','Carrier','Clear'})
title('Recessive, split x split', 'Color', theme.textColor)
ylabel('Probability', 'Color', theme.textColor)
grid on

ax = nexttile;
styleAxes(ax, theme);
bar([0.75 0.25], 'FaceColor', theme.series(2,:))
ylim([0 1])
set(ax, 'XTickLabel', {'Visual','Non-carrier'})
title('Dominant, het x het', 'Color', theme.textColor)
grid on

ax = nexttile;
styleAxes(ax, theme);
bar([0.50 0.50], 'FaceColor', theme.series(3,:))
ylim([0 1])
set(ax, 'XTickLabel', {'Split sons','Visual daughters'})
title('Sex-linked, visual cock x wild hen', 'Color', theme.textColor)
grid on

fprintf('\n2.4 Weighted compatibility scoring derived from the inheritance outcomes\n')
fprintf('Raw = Species + Inheritance + Mutation + Risk + Diversity + Constraints\n')
fprintf('Maximum = 30 + 20 + 15 + 15 + 10 + 10 = 100\n')
fprintf('Excellent 90-100, Good 75-89, Fair 60-74, Poor 40-59, Not Recommended 0-39.\n')
fprintf('A block stores min(Raw, 39).\n\n')

spPts = [30 18 12 8 0];
spName = {'Same species','Documented hybrid','Limited','Undocumented','Unsupported'};
nm = {
    'Same species, complete, no warnings'
    'Documented hybrid, otherwise complete'
    'Limited, two unverified genes, one shared recessive'
    'Undocumented, infertile, two unverified, one shared recessive'
    'Undocumented, thin records, stacked warnings'
    'Unsupported species, otherwise strong'
    'Invalid mutation, prediction blocked'
    'Same species, one close-relationship warning'
};
short = {'Same','Hybrid','Limited','Undoc.','Thin','Unsup.','Invalid','Close'};

M = [
    1 1 4 0 2  0 0  0 0 0  2 2 3  1 1 0  0
    2 1 4 0 2  0 0  0 0 0  2 2 3  0 1 0  0
    3 1 2 2 1  0 2  1 0 0  2 2 3  0 1 0  0
    4 1 2 2 1  0 2  1 0 0  2 1 3  0 1 1  0
    4 0 0 0 0  0 5  1 1 1  0 0 0  0 1 0  0
    5 1 4 0 2  0 0  0 0 0  2 2 3  0 1 0  1
    1 1 4 0 2  1 0  0 0 0  2 2 3  1 0 0  1
    1 1 4 0 2  0 0  0 1 0  2 2 3  1 1 0  0
];

rawV = zeros(1,8);
finV = zeros(1,8);

fprintf('%-62s %5s %5s  %s\n', 'Case', 'Raw', 'Final', 'Label')
for c = 1:8
    sp = M(c,1);
    Ps = spPts(sp);

    Pi = 0;
    if M(c,2) == 1
        Pi = Pi + 8;
    end
    if M(c,3) > 0
        Pi = Pi + min(6, 2 + M(c,3));
    end
    if M(c,4) == 0 && M(c,2) == 1
        Pi = Pi + 4;
    elseif M(c,4) > 0
        Pi = Pi + max(0, 4 - M(c,4));
    end
    if M(c,5) == 2
        Pi = Pi + 2;
    elseif M(c,5) == 1
        Pi = Pi + 1;
    end
    Pi = min(20, Pi);

    if M(c,6) == 1
        Pm = 0;
    else
        Pm = max(0, 15 - 3 * M(c,7));
    end

    if sp == 5
        Pr = 0;
    else
        Pr = max(0, 15 - 5 * M(c,8) - 8 * M(c,9) - 2 * M(c,10));
    end

    Pd = 0;
    if M(c,11) == 2
        Pd = Pd + 4;
    elseif M(c,11) == 1
        Pd = Pd + 1;
    end
    if M(c,12) == 2
        Pd = Pd + 3;
    elseif M(c,12) == 1
        Pd = Pd + 1;
    end
    if M(c,13) == 3
        Pd = Pd + 3;
    elseif M(c,13) == 2
        Pd = Pd + 2;
    elseif M(c,13) == 1
        Pd = Pd + 1;
    end
    if M(c,14) == 1
        Pd = Pd + 1;
    end
    Pd = min(10, Pd);

    if M(c,15) == 0
        Pc = 0;
    else
        Pc = max(0, 10 - 3 * M(c,10) - 5 * M(c,16));
    end

    raw = Ps + Pi + Pm + Pr + Pd + Pc;

    if M(c,17) == 1
        final = min(raw, 39);
        lab = 'Not Recommended';
    else
        final = max(0, min(100, raw));
        if final >= 90
            lab = 'Excellent';
        elseif final >= 75
            lab = 'Good';
        elseif final >= 60
            lab = 'Fair';
        elseif final >= 40
            lab = 'Poor';
        else
            lab = 'Not Recommended';
        end
    end

    rawV(c) = raw;
    finV(c) = final;

    fprintf('%-62s %5d %5d  %s\n', nm{c}, raw, final, lab)
    fprintf('   %s %d + inheritance %d + mutation %d + risk %d + diversity %d + constraints %d\n', ...
        spName{sp}, Ps, Pi, Pm, Pr, Pd, Pc)
end

fprintf('\nChapter 4 reading: the stored score leaves the raw score only on the unsupported pair\n')
fprintf('(55 stored as 39) and the invalid mutation (75 stored as 39).\n')
fprintf('A close-relationship warning leaves an otherwise complete pair at 92, still Excellent.\n')

figure(4)
ax = axes;
styleAxes(ax, theme);
bar(1:8, [rawV; finV]', 'grouped')
hold on
yline(39, '--', 'Blocking cap = 39', 'Color', theme.capColor, 'LineWidth', 1.2)
ylim([0 110])
set(ax, 'XTick', 1:8, 'XTickLabel', short)
ylabel('Score', 'Color', theme.textColor)
title('2.4 Weighted compatibility score', 'Color', theme.textColor)
legend({'Raw score','Stored score'}, 'Location', 'northeast', 'TextColor', theme.textColor)
grid on

fprintf('\n2.5 Consistency with documented breeding records\n')
fprintf('This is the end-user rating. It is not a counted match against nest books.\n')
fprintf('================================================================\n')

scale = [1 2 3 4 5];
freq = [0 0 2 14 4];
labels = {'Strongly Disagree','Disagree','Undecided','Agree','Strongly Agree'};
N = sum(freq);
WM = sum(freq .* scale) / N;

fprintf('\nItem: The predicted offspring distributions closely match manual breeding expectations or past aviary records.\n')
fprintf('WM = (f1*1 + f2*2 + f3*3 + f4*4 + f5*5) / N\n')
fprintf('WM = (%d*1 + %d*2 + %d*3 + %d*4 + %d*5) / %d\n', freq(1), freq(2), freq(3), freq(4), freq(5), N)
fprintf('WM = %d / %d = %.2f\n', sum(freq .* scale), N, WM)

if WM >= 4.21
    band = 'Strongly Agree';
elseif WM >= 3.41
    band = 'Agree';
elseif WM >= 2.61
    band = 'Undecided';
elseif WM >= 1.81
    band = 'Disagree';
else
    band = 'Strongly Disagree';
end

fprintf('Interpretation: %s. The Agree band is 3.41 to 4.20. Strongly Agree begins at 4.21.\n', band)
fprintf('Fourteen respondents marked Agree and four marked Strongly Agree. Two were Undecided. None disagreed.\n')

fprintf('\nCounted nest-book comparison:\n')
compared = 0;
matched = 0;
fprintf('Documented offspring rows compared with a prediction = %d\n', compared)
fprintf('Rows in which the recorded chick matched the predicted visual or carrier = %d\n', matched)
if compared == 0
    fprintf('Match rate = matched / compared is not computed, because no nest or pedigree book was scored.\n')
else
    fprintf('Match rate = %.2f\n', matched / compared)
end
fprintf('The seven hand-computed grids are a rule check. They are not aviary records, so they are not entered here.\n')
fprintf('Chapter 4 reading: consistency with breeding records is the Agree rating %.2f. It is not a percentage of real chicks.\n', WM)

figure(5)
ax = axes;
styleAxes(ax, theme);
bar(scale, freq, 'FaceColor', theme.series(1,:))
set(ax, 'XTick', scale, 'XTickLabel', labels)
xlabel('Response', 'Color', theme.textColor)
ylabel('Respondents', 'Color', theme.textColor)
title('2.5 Responses on match to aviary records', 'Color', theme.textColor)
ylim([0 16])
grid on
for k = 1:5
    text(scale(k), freq(k) + 0.3, num2str(freq(k)), ...
        'HorizontalAlignment', 'center', ...
        'FontName', 'Times New Roman', ...
        'Color', theme.textColor)
end

figure(6)
ax = axes;
styleAxes(ax, theme);
hold on
patch([3.41 4.20 4.20 3.41], [0 0 1 1], [0.85 0.93 0.85], ...
    'EdgeColor', 'none', 'FaceAlpha', 0.8)
plot([WM WM], [0 1], '-', 'Color', theme.series(1,:), 'LineWidth', 2)
plot(4.21, 0.5, '|', 'MarkerSize', 14, 'Color', theme.capColor, 'LineWidth', 1.4)
xlim([1 5])
ylim([0 1])
set(ax, 'YTick', [], 'XTick', 1:5)
xlabel('Weighted mean', 'Color', theme.textColor)
title(sprintf('2.5 Weighted mean = %.2f, inside Agree', WM), 'Color', theme.textColor)
text(WM, 0.72, sprintf('%.2f', WM), ...
    'HorizontalAlignment', 'center', ...
    'FontName', 'Times New Roman', ...
    'Color', theme.series(1,:))
text(3.80, 0.18, 'Agree', 'HorizontalAlignment', 'center', 'FontName', 'Times New Roman', 'Color', theme.textColor)
text(4.21, 0.88, '4.21', 'HorizontalAlignment', 'center', 'FontName', 'Times New Roman', 'Color', theme.capColor)
grid on


function theme = getPlotTheme()
figColor = get(groot, 'defaultFigureColor');
if isempty(figColor) || ~isnumeric(figColor) || numel(figColor) ~= 3
    figColor = [1 1 1];
end

if mean(figColor) < 0.5
    theme.figureColor = [0.13 0.13 0.13];
    theme.axesColor = [0.13 0.13 0.13];
    theme.textColor = [1 1 1];
    theme.gridColor = [0.85 0.85 0.85];
    theme.legendColor = [0.13 0.13 0.13];
    theme.series = [
        0.30 0.74 0.93
        0.93 0.69 0.13
        0.47 0.67 0.19
        0.95 0.65 0.20
        0.15 0.35 0.70
    ];
    theme.capColor = [0.70 0.15 0.15];
else
    theme.figureColor = [1 1 1];
    theme.axesColor = [1 1 1];
    theme.textColor = [0 0 0];
    theme.gridColor = [0.80 0.80 0.80];
    theme.legendColor = [1 1 1];
    theme.series = [
        0.00 0.45 0.74
        0.85 0.33 0.10
        0.47 0.67 0.19
        0.93 0.69 0.13
        0.49 0.18 0.56
    ];
    theme.capColor = [0.70 0.15 0.15];
end
end

function styleAxes(ax, theme)
set(ax, ...
    'Color', theme.axesColor, ...
    'XColor', theme.textColor, ...
    'YColor', theme.textColor, ...
    'GridColor', theme.gridColor, ...
    'GridAlpha', 0.25, ...
    'FontName', 'Times New Roman', ...
    'FontSize', 11, ...
    'LineWidth', 1)
set(gcf, 'Color', theme.figureColor)
grid(ax, 'on')
box(ax, 'on')
end
