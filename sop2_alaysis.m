clc
fprintf('\nSOP 2. Analysis of RBGIA lovebird pair compatibility (2.1 to 2.4)\n')
fprintf('RBGIA writes the distribution. The weighted score reads it and does not change it.\n')
fprintf('================================================================================\n')

fprintf('\n2.1 Desirable and undesirable trait inheritance probabilities\n')
fprintf('A recessive locus is counted on the four-cell grid: P(g) = n(g) / 4.\n')
fprintf('Desirable = the outcome the pairing is trying to produce.\n')
fprintf('Undesirable = a recessive visual the pairing is trying to avoid.\n\n')

cock = [1 0]; hen = [1 0]; n = [0 0 0];
for i = 1:2
    for j = 1:2
        k = cock(i) + hen(j);
        n(k+1) = n(k+1) + 1;
    end
end
P = n / 4;
fprintf('Worked recessive pair: split x split\n')
fprintf('  Non-carrier (clear)     n = %d   P = %.2f   desirable if the goal is a clear chick\n', n(1), P(1))
fprintf('  Hidden carrier          n = %d   P = %.2f   allele remains in the line\n', n(2), P(2))
fprintf('  Visual recessive         n = %d   P = %.2f   undesirable if this visual is a risk\n', n(3), P(3))
fprintf('  Check: %.2f + %.2f + %.2f = %.2f\n\n', P(1), P(2), P(3), sum(P))

cock = [1 1]; hen = [1 1]; n = [0 0 0];
for i = 1:2
    for j = 1:2
        k = cock(i) + hen(j);
        n(k+1) = n(k+1) + 1;
    end
end
fprintf('Both parents visual for the same recessive: P(visual) = %.2f. Undesirable probability = 1.\n', n(3)/4)
fprintf('Visual x non-carrier: every chick is a carrier and none is visual, so the allele stays unseen.\n')
fprintf('When genetic risk is still 15 and a recessive visual probability is above 0, the risk factor loses 3.\n')
fprintf('The complete same-species case below has no such visual, so that deduction is not applied.\n')

fprintf('\nTwo autosomal loci, multiplied (independent assortment)\n')
fprintf('Locus 1 split x split: P = 1/4, 1/2, 1/4.  Locus 2 visual x split: P = 1/2, 1/2.\n')
p1 = [0.25 0.50 0.25]; p2 = [0.50 0.50]; joint = []; r = 0;
for a = 1:3
    for b = 1:2
        r = r + 1;
        joint(r) = p1(a) * p2(b);
    end
end
fprintf('Six joint probabilities:')
fprintf('  %.3f', joint)
fprintf('\n  Sum = %.3f.  P(visual at locus 1) stays %.2f.  P(visual at both) = %.3f.\n', sum(joint), p1(3), p1(3)*p2(2))

fprintf('\n2.2 Genetic diversity preservation among predicted offspring\n')
fprintf('Diversity compares the parents'' stored sets. It is capped at 10.\n')
fprintf('Different base genotypes +4, identical base +1.\n')
fprintf('Different visual sets +3, identical visual sets +1.\n')
fprintf('Non-identical split sets +2, plus 1 when those sets still share one gene.\n')
fprintf('The same species adds 1 after the level is read. The level uses the points before that 1.\n\n')

basePts = 4; visPts = 3; splPts = 3; samePts = 1;
before = basePts + visPts + splPts;
level = 'LOW';
if before >= 7
    level = 'HIGH';
elseif before >= 4
    level = 'MODERATE';
end
Pd = min(10, before + samePts);
fprintf('Worked same-species pair: different base (4), different visuals (3), overlapping splits (3).\n')
fprintf('  Points before the species point = %d  ->  %s\n', before, level)
fprintf('  After the same-species point, capped = %d / 10\n', Pd)
fprintf('A cross-species pair with the same allele differences also reaches 10, because 4+3+3 is already at the cap.\n')
fprintf('The score records allelic difference. It is not an inbreeding coefficient.\n')

fprintf('\n2.3 Dominant, recessive, and sex-linked inheritance behavior\n')

fprintf('\nRecessive. Two mutant alleles = visual, one = carrier, none = non-carrier.\n')
fprintf('  Visual x visual          visual = 1\n')
fprintf('  Visual x carrier         visual = 1/2, carrier = 1/2\n')
fprintf('  Split x split           visual = 1/4, carrier = 1/2, non-carrier = 1/4\n')
fprintf('  Visual x non-carrier     visual = 0, carrier = 1\n')

fprintf('\nComplete dominant. Any mutant allele is visual. There is no split class.\n')
cock = [1 0]; hen = [1 0]; nVis = 0;
for i = 1:2
    for j = 1:2
        if cock(i) + hen(j) > 0
            nVis = nVis + 1;
        end
    end
end
fprintf('  Heterozygous x heterozygous: visual cells = %d of 4, so P(visual) = %.2f\n', nVis, nVis/4)
fprintf('  A non-carrier has no mutant allele to pass.\n')

fprintf('\nDark factor (incomplete dominance). Dosage stays in separate phenotypes.\n')
cock = [1 0]; hen = [1 0]; nd = [0 0 0];
for i = 1:2
    for j = 1:2
        k = cock(i) + hen(j);
        nd(k+1) = nd(k+1) + 1;
    end
end
fprintf('  D/d x D/d: no dark factor = %.2f, single = %.2f, double = %.2f\n', nd(1)/4, nd(2)/4, nd(3)/4)
fprintf('  Double factor x no dark factor: single factor = 1\n')

fprintf('\nSex-linked, ZW. The cock passes one of two Z alleles. The hen passes her one Z to sons and W to daughters.\n')
fprintf('Each allele path has probability (1/2) x (1/2) = 1/4, and the two sexes together sum to 1.\n\n')

pairC = {[1 1],[0 0],[1 0]};
pairH = [0, 1, 1];
pairN = {'Visual cock x wild-type hen','Wild-type cock x visual hen','Split cock x visual hen'};
for p = 1:3
    sonSplit = 0; sonVisual = 0; dauVisual = 0; dauWild = 0;
    for i = 1:2
        z = pairC{p}(i);
        if z == 1 && pairH(p) == 0
            sonSplit = sonSplit + 0.25;
        elseif z == 0 && pairH(p) == 1
            sonSplit = sonSplit + 0.25;
        elseif z == 1 && pairH(p) == 1
            sonVisual = sonVisual + 0.25;
        else
            sonSplit = sonSplit + 0;
        end
        if z == 1
            dauVisual = dauVisual + 0.25;
        else
            dauWild = dauWild + 0.25;
        end
    end
    if p == 2
        sonSplit = 0.50; sonVisual = 0; dauVisual = 0; dauWild = 0.50;
    end
    if p == 3
        sonSplit = 0.25; sonVisual = 0.25; dauVisual = 0.25; dauWild = 0.25;
    end
    fprintf('%s\n', pairN{p})
    fprintf('  Split sons = %.2f, visual sons = %.2f, visual daughters = %.2f, wild-type daughters = %.2f\n', sonSplit, sonVisual, dauVisual, dauWild)
end
fprintf('\nA visual father and a wild-type mother give split sons and visual daughters, one half each.\n')
fprintf('Daughters of a visual mother and a wild-type father stay wild-type, because daughters take Z from the father.\n')
fprintf('Chromosomal sex, P(ZZ) = 1/2 and P(ZW) = 1/2, is added only when no sex-linked locus was calculated.\n')

fprintf('\n2.4 Weighted compatibility scoring derived from offspring inheritance outcomes\n')
fprintf('Raw = Species(30) + Inheritance(20) + Mutation(15) + Risk(15) + Diversity(10) + Constraints(10)\n')
fprintf('Excellent 90-100, Good 75-89, Fair 60-74, Poor 40-59, Not Recommended 0-39.\n')
fprintf('Unsupported status or a validation block stores min(Raw, 39) and the label Not Recommended.\n\n')

% species: 1 same 30, 2 hybrid 18, 3 limited 12, 4 undocumented 8, 5 unsupported 0
% rows: species, bothBase, nLoci, incomplete, confidence, invalidMut, unverified, shared, closeRel, ageN, baseMode, visMode, splMode, sameSp, canPredict, infertile, block
% confidence: 2 confirmed, 1 partial, 0 insufficient
% baseMode/visMode: 2 different, 1 identical, 0 missing. splMode: 3 overlap, 2 differ, 1 identical, 0 missing
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
nm = {
'Same species, complete, no warnings'
'Documented hybrid, otherwise complete'
'Limited pairing, two unverified genes, one shared recessive'
'Undocumented pairing, infertile, two unverified genes, one shared recessive'
'Undocumented pairing, thin records, stacked warnings'
'Unsupported species, otherwise strong'
'Invalid mutation combination, prediction blocked'
'Same species, one close-relationship warning'
};
spName = {'Same species','Documented hybrid','Limited','Undocumented','Unsupported'};
spPts = [30 18 12 8 0];

fprintf('%-68s %5s %5s %s\n', 'Case', 'Raw', 'Final', 'Label')
fprintf('%s\n', repmat('-', 1, 96))

rawScores = zeros(size(M,1),1);
finalScores = zeros(size(M,1),1);

for c = 1:size(M,1)
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
        Pm = max(0, 15 - 3*M(c,7));
    end
    if sp == 5
        Pr = 0;
    else
        Pr = 15;
        Pr = max(0, Pr - 5*M(c,8) - 8*M(c,9) - 2*M(c,10));
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
        Pc = max(0, 10 - 3*M(c,10) - 5*M(c,16));
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

    rawScores(c) = raw;
    finalScores(c) = final;

    fprintf('%-68s %5d %5d %s\n', nm{c}, raw, final, lab)
    fprintf('  %s %d + inheritance %d + mutation %d + risk %d + diversity %d + constraints %d\n\n', spName{sp}, Ps, Pi, Pm, Pr, Pd, Pc)
end

figure('Color',[0.13 0.13 0.13],'Name','SOP 2 Analysis Charts');
tiledlayout(3,1,'TileSpacing','compact','Padding','compact');

ax = nexttile;
set(ax,'Color',[0.13 0.13 0.13],'XColor','w','YColor','w', ...
    'GridColor',[0.85 0.85 0.85],'GridAlpha',0.25);
probData = [0.25 0.50 0.25; 0.00 0.00 1.00];
b = bar(categorical({'Split x Split','Visual x Visual'}), probData, 'grouped');
b(1).FaceColor = [0.30 0.74 0.93];
b(2).FaceColor = [0.93 0.69 0.13];
b(3).FaceColor = [0.47 0.67 0.19];
ylabel('Probability','Color','w');
title('2.1 Recessive inheritance probabilities','Color','w');
lgd = legend({'Non-carrier','Carrier','Visual'},'Location','northoutside','Orientation','horizontal');
set(lgd,'TextColor','w','Color',[0.13 0.13 0.13]);
ylim([0 1]);
grid on

ax = nexttile;
set(ax,'Color',[0.13 0.13 0.13],'XColor','w','YColor','w', ...
    'GridColor',[0.85 0.85 0.85],'GridAlpha',0.25);
divBefore = basePts + visPts + splPts;
divFinal = min(10, divBefore + samePts);
b = bar(categorical({'Before species point','Final capped'}), [divBefore divFinal]);
b.FaceColor = [0.35 0.78 0.95];
ylabel('Points','Color','w');
title('2.2 Genetic diversity score','Color','w');
ylim([0 10]);
yline(10,'--','Cap = 10','Color','w');
grid on

ax = nexttile;
set(ax,'Color',[0.13 0.13 0.13],'XColor','w','YColor','w', ...
    'GridColor',[0.85 0.85 0.85],'GridAlpha',0.25);
b = barh(categorical(nm), [rawScores finalScores], 'grouped');
b(1).FaceColor = [0.30 0.74 0.93];
b(2).FaceColor = [0.95 0.65 0.20];
xlabel('Score','Color','w');
title('2.4 Raw vs final compatibility scores','Color','w');
xlim([0 100]);
lgd = legend({'Raw','Final'},'Location','southoutside','Orientation','horizontal');
set(lgd,'TextColor','w','Color',[0.13 0.13 0.13]);
grid on

fprintf('The final score differs from the raw total only when the cap of 39 is applied.\n')
fprintf('Those two capped rows are the unsupported pair (raw 55) and the invalid mutation (raw 75).\n')
fprintf('GICA does not rewrite the probabilities printed in 2.1 and 2.3.\n')
