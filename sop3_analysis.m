close all
clc

fprintf('\nSOP 3. Computational performance and algorithmic behavior of RBGIA\n')
fprintf('3.1 to 3.6\n')
fprintf('Punnett and the score contain no random draw. Cost is an operation count, not a wall-clock time.\n')
fprintf('================================================================\n')

expP = [1 1 1 0.5 0.5 1 0.25 0.25 0.25 0.25 0.5 0.5];
run1 = zeros(1,12);
run2 = zeros(1,12);

for pass = 1:2
    v = zeros(1,12);
    cock = {'bl+','bl+'}; hen = {'bl+','bl+'}; n = 0;
    for i = 1:2
        for j = 1:2
            if strcmp(cock{i},'bl+') && strcmp(hen{j},'bl+')
                n = n + 1;
            end
        end
    end
    v(1) = n / 4;

    cock = {'blaq','blaq'}; hen = {'bl+','bl+'}; n = 0;
    for i = 1:2
        for j = 1:2
            pair = sort({cock{i}, hen{j}});
            if strcmp(pair{1},'bl+') && strcmp(pair{2},'blaq')
                n = n + 1;
            end
        end
    end
    v(2) = n / 4;

    cock = {'blaq','blaq'}; hen = {'blaq','blaq'}; n = 0;
    for i = 1:2
        for j = 1:2
            if strcmp(cock{i},'blaq') && strcmp(hen{j},'blaq')
                n = n + 1;
            end
        end
    end
    v(3) = n / 4;

    cock = {'D+','D'}; hen = {'D+','D+'}; nNone = 0; nSingle = 0; nDouble = 0;
    for i = 1:2
        for j = 1:2
            if strcmp(cock{i},'D+') && strcmp(hen{j},'D+')
                nNone = nNone + 1;
            elseif strcmp(cock{i},'D') && strcmp(hen{j},'D')
                nDouble = nDouble + 1;
            else
                nSingle = nSingle + 1;
            end
        end
    end
    v(4) = nNone / 4;
    v(5) = nSingle / 4;

    cock = {'a*bz','a*bz'}; hen = {'a+','a+'}; n = 0;
    for i = 1:2
        for j = 1:2
            pair = sort({cock{i}, hen{j}});
            if strcmp(pair{1},'a*bz') && strcmp(pair{2},'a+')
                n = n + 1;
            end
        end
    end
    v(6) = n / 4;

    cockZ = {'ino+','ino'}; henZ = 'ino+';
    sonWild = 0; sonSplit = 0; dauWild = 0; dauIno = 0;
    for i = 1:2
        if strcmp(cockZ{i}, henZ)
            sonWild = sonWild + 0.25;
        else
            sonSplit = sonSplit + 0.25;
        end
        if strcmp(cockZ{i},'ino+')
            dauWild = dauWild + 0.25;
        else
            dauIno = dauIno + 0.25;
        end
    end
    v(7) = sonWild; v(8) = sonSplit; v(9) = dauWild; v(10) = dauIno;

    cockZ = {'ino','ino'}; henZ = 'ino+';
    sonSplit = 0; dauIno = 0;
    for i = 1:2
        if ~strcmp(cockZ{i}, henZ)
            sonSplit = sonSplit + 0.25;
        end
        if strcmp(cockZ{i},'ino')
            dauIno = dauIno + 0.25;
        end
    end
    v(11) = sonSplit; v(12) = dauIno;

    if pass == 1
        run1 = v;
    else
        run2 = v;
    end
end

detDiff = max(abs(run1 - run2));
accDiff = max(abs(run1 - expP));

fprintf('\n3.1 Logical determinism\n')
fprintf('The same 12 genotype probabilities were built twice. No random number was used.\n')
fprintf('Maximum absolute difference between pass 1 and pass 2 = %.4f\n', detDiff)
if detDiff == 0
    fprintf('Result: the distribution repeats.\n')
else
    fprintf('Result: the two passes differ.\n')
end

rolls = [0.10 0.20 0.30; 0.99 0.10 0.10; 0.50 0.96 0.10];
tend = [0.94 0.95 0.95];
status = zeros(3,2);
for pass = 1:2
    for egg = 1:3
        status(egg,pass) = 1;
        for stage = 1:3
            if rolls(egg,stage) > tend(stage)
                status(egg,pass) = 0;
                break
            end
        end
    end
end
fprintf('Clutch illustration, same rolls twice. Status match = %d. Inheritance vector unchanged = %d.\n', all(status(:,1)==status(:,2)), max(abs(run1-run2))==0)
fprintf('A new roll can change an egg. It does not change the 12 probabilities.\n')

figure(1)
plot(run1, run2, 'o', 'MarkerSize', 8, 'MarkerFaceColor', [0.00 0.45 0.74], 'Color', [0.00 0.45 0.74])
hold on
plot([0 1], [0 1], '--', 'Color', [0.70 0.15 0.15], 'LineWidth', 1.2)
xlim([0 1.05]); ylim([0 1.05])
xlabel('Pass 1 probability'); ylabel('Pass 2 probability')
title('3.1 Logical determinism')
grid on
set(gca,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')
set(gcf,'Color','w')
text(0.05, 0.92, sprintf('max |pass1 - pass2| = %.4f', detDiff), 'FontName','Times New Roman')

fprintf('\n3.2 Genetic inheritance accuracy\n')
fprintf('Seven hand-computed cases. Agreement means the absolute error is 0.\n')
names = {'Green x green','Aqua x green','Aqua x aqua','Dark green x green, no dark','Dark green x green, single dark','Bronze fallow x non-carrier','SL ino split cock, wild son','SL ino split cock, split son','SL ino split cock, wild daughter','SL ino split cock, visual daughter','SL ino visual cock, split son','SL ino visual cock, visual daughter'};
fprintf('%-44s %10s %10s %10s\n','Outcome','Hand','RBGIA','Error')
for k = 1:12
    fprintf('%-44s %10.2f %10.2f %10.4f\n', names{k}, expP(k), run1(k), abs(run1(k)-expP(k)))
end
fprintf('Cases = 7. Outcomes = 12. Maximum absolute error = %.4f\n', accDiff)
if accDiff == 0
    fprintf('Result: the grid matches the hand computation.\n')
else
    fprintf('Result: at least one outcome does not match.\n')
end

figure(2)
plot(expP, run1, 's', 'MarkerSize', 8, 'MarkerFaceColor', [0.85 0.33 0.10], 'Color', [0.85 0.33 0.10])
hold on
plot([0 1], [0 1], '--', 'Color', [0.70 0.15 0.15], 'LineWidth', 1.2)
xlim([0 1.05]); ylim([0 1.05])
xlabel('Hand-computed probability'); ylabel('RBGIA probability')
title('3.2 Genetic inheritance accuracy')
grid on
set(gca,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')
set(gcf,'Color','w')
text(0.05, 0.92, sprintf('7 cases, max |error| = %.4f', accDiff), 'FontName','Times New Roman')

fprintf('\n3.3 Compatibility scoring effectiveness\n')
fprintf('Effectiveness here is movement with the written rule, including the cap.\n')
fprintf('It is not a claim that breeders prefer the weights.\n')
fprintf('Raw = 30 + 20 + 15 + 15 + 10 + 10 at most.\n')
fprintf('A block stores min(Raw, 39). A stored 75 would be the wrong label.\n\n')

spPts = [30 18 12 8 0];
spName = {'Same species','Documented hybrid','Limited','Undocumented','Unsupported'};
nm = {'Same species, complete','Documented hybrid','Limited, two unverified, one shared recessive','Undocumented, infertile, same deductions','Thin records, stacked warnings','Unsupported species','Invalid mutation, blocked','One close-relationship warning'};
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
rawV = zeros(1,8); finV = zeros(1,8); labs = cell(1,8);
for c = 1:8
    sp = M(c,1); Ps = spPts(sp); Pi = 0;
    if M(c,2)==1, Pi = Pi + 8; end
    if M(c,3)>0, Pi = Pi + min(6, 2+M(c,3)); end
    if M(c,4)==0 && M(c,2)==1
        Pi = Pi + 4;
    elseif M(c,4)>0
        Pi = Pi + max(0, 4-M(c,4));
    end
    if M(c,5)==2, Pi = Pi + 2; elseif M(c,5)==1, Pi = Pi + 1; end
    Pi = min(20, Pi);
    if M(c,6)==1, Pm = 0; else, Pm = max(0, 15-3*M(c,7)); end
    if sp==5, Pr = 0; else, Pr = max(0, 15-5*M(c,8)-8*M(c,9)-2*M(c,10)); end
    Pd = 0;
    if M(c,11)==2, Pd = Pd + 4; elseif M(c,11)==1, Pd = Pd + 1; end
    if M(c,12)==2, Pd = Pd + 3; elseif M(c,12)==1, Pd = Pd + 1; end
    if M(c,13)==3, Pd = Pd + 3; elseif M(c,13)==2, Pd = Pd + 2; elseif M(c,13)==1, Pd = Pd + 1; end
    if M(c,14)==1, Pd = Pd + 1; end
    Pd = min(10, Pd);
    if M(c,15)==0, Pc = 0; else, Pc = max(0, 10-3*M(c,10)-5*M(c,16)); end
    raw = Ps+Pi+Pm+Pr+Pd+Pc;
    if M(c,17)==1
        final = min(raw, 39); lab = 'Not Recommended';
    else
        final = max(0, min(100, raw));
        if final>=90, lab = 'Excellent';
        elseif final>=75, lab = 'Good';
        elseif final>=60, lab = 'Fair';
        elseif final>=40, lab = 'Poor';
        else, lab = 'Not Recommended';
        end
    end
    rawV(c) = raw; finV(c) = final; labs{c} = lab;
    fprintf('%-52s raw %3d  stored %3d  %s\n', nm{c}, raw, final, lab)
end
fprintf('Invalid mutation raw 75 is stored as %d, so it is not labeled Good.\n', finV(7))
fprintf('Unsupported raw 55 is stored as %d.\n', finV(6))

figure(3)
bar(1:8, [rawV; finV]', 'grouped')
hold on
yline(39, '--', 'Cap = 39', 'Color', [0.70 0.15 0.15], 'LineWidth', 1.2)
ylim([0 110])
set(gca,'XTick',1:8,'XTickLabel',short,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')
ylabel('Score'); title('3.3 Compatibility scoring effectiveness')
legend({'Raw score','Stored score'}, 'Location','northeast')
grid on
set(gcf,'Color','w')

fprintf('\n3.4 Time complexity\n')
fprintf('One autosomal locus evaluates a 2 x 2 grid. One sex-linked locus evaluates two Z alleles.\n')
fprintf('With M loci and at most K allele combinations on a locus, the Punnett work is O(M) to O(M·K).\n')
Ms = 1:12;
counted = zeros(1,12);
for m = 1:12
    n = 0;
    for locus = 1:m
        for i = 1:2
            for j = 1:2
                n = n + 1;
            end
        end
    end
    counted(m) = n;
end
fprintf('Counted Punnett cells at M = 12: %d. Formula 4M = %d.\n', counted(12), 4*12)

figure(4)
plot(Ms, counted, '-o', 'LineWidth', 1.8, 'MarkerFaceColor', [0.00 0.45 0.74], 'Color', [0.00 0.45 0.74])
hold on
plot(Ms, 8*Ms, '--', 'Color', [0.85 0.33 0.10], 'LineWidth', 1.4)
xlabel('Number of loci, M'); ylabel('Cells evaluated')
title('3.4 Time complexity')
legend({'K = 4, counted 4M','K = 8, bound M·K'}, 'Location','northwest')
grid on
set(gca,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')
set(gcf,'Color','w')

fprintf('\n3.5 Space complexity\n')
fprintf('The trait map stores one record per locus, so that part is O(M).\n')
fprintf('The joint table is extra space. It is not part of the O(M) map.\n')
jointRows = 3 .^ Ms;
fprintf('At M = 8, trait-map rows = %d and unmerged joint genotypes = %d.\n', 8, 3^8)

figure(5)
yyaxis left
plot(Ms, Ms, '-o', 'LineWidth', 1.8, 'MarkerFaceColor', [0.00 0.45 0.74])
ylabel('Trait-map rows, O(M)')
yyaxis right
semilogy(Ms, jointRows, '-s', 'LineWidth', 1.8, 'MarkerFaceColor', [0.85 0.33 0.10])
ylabel('Joint genotypes, 3^M')
xlabel('Number of loci, M')
title('3.5 Space complexity')
grid on
set(gca,'FontName','Times New Roman')
set(gcf,'Color','w')

fprintf('\n3.6 Scalability as trait combinations increase\n')
fprintf('Each new 3-genotype locus multiplies the joint table.\n')
fprintf('A path is dropped when its probability falls below 10^{-12}.\n')

Ms6 = 1:20;
jointRows6 = 3 .^ Ms6;
chain6 = (0.25) .^ Ms6;
cut6 = find(chain6 < 1e-12, 1, 'first');

fprintf('A chain of independent 1/4 outcomes first falls below 10^{-12} at M = %d.\n', cut6)
fprintf('The joint table count is 3^M, while the chain probability is (1/4)^M.\n')
fprintf('They are shown on separate axes so the count and probability are not mixed.\n')

figure(6)
tiledlayout(1,2,'TileSpacing','compact','Padding','compact')

nexttile
plot(Ms6, jointRows6, '-o', ...
    'LineWidth', 1.8, ...
    'MarkerFaceColor', [0.00 0.45 0.74], ...
    'Color', [0.00 0.45 0.74])
xlabel('Number of loci, M')
ylabel('Joint genotypes, 3^M')
title('Joint table growth')
grid on
set(gca,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')

nexttile
semilogy(Ms6, chain6, '-s', ...
    'LineWidth', 1.8, ...
    'MarkerFaceColor', [0.85 0.33 0.10], ...
    'Color', [0.85 0.33 0.10])
hold on
yline(1e-12, '--', 'Cutoff 10^{-12}', 'Color', [0.70 0.15 0.15], 'LineWidth', 1.2)
xlabel('Number of loci, M')
ylabel('Probability of one 1/4 chain')
title(sprintf('Chain drops below cutoff at M = %d', cut6))
legend({'One 1/4 chain','Cutoff'}, 'Location', 'southwest')
grid on
set(gca,'FontName','Times New Roman','Color','w','XColor','k','YColor','k')
set(gcf,'Color','w')


fprintf('\nSummary for Chapter 4\n')
fprintf('3.1 Determinism: max difference = %.4f\n', detDiff)
fprintf('3.2 Accuracy: 7 hand-computed cases, max error = %.4f\n', accDiff)
fprintf('3.3 Scoring: raw 75 stored as %d; raw 55 stored as %d; close-relationship pair stored as %d\n', finV(7), finV(6), finV(8))
fprintf('3.4 Time: Punnett cells = 4M for K = 4, inside O(M) to O(M·K)\n')
fprintf('3.5 Space: trait map = M; joint table is additional\n')
fprintf('3.6 Scale: joint genotypes = 3^M; the 1/4 chain drops at M = %d; no millisecond claim\n', cut6)
