import cliProgress from 'cli-progress';

export function createProgressBar(total) {
    return new cliProgress.SingleBar({
        format: 'Migration Progress |{bar}| {percentage}% || {value}/{total} Patients',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic).start(total, 0);
}