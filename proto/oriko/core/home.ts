// The two folders oriko may use: the data folder, and the working directory of the call.
import { cwd, envDir, root } from '@honeyglass/adx';

/** `~/.oriko`, with `cvs/NAME.json` and `profiles/NAME.json`. `--home` and `ORIKO_HOME` move it. */
export const home = root('home', envDir('ORIKO_HOME'));
/** Where `build --out` writes. */
export const work = root('work', cwd);

export const cvFile = (name: string) => home.file(`cvs/${name}.json`);
export const profileFile = (name: string) => home.file(`profiles/${name}.json`);
// What read stores: the posting beside its profile, and the notes beside their CV.
export const postingFile = (name: string) => home.file(`profiles/${name}.posting.md`);
export const notesFile = (name: string) => home.file(`cvs/${name}.notes.md`);

/** A CV or a profile as oriko writes it: plain JSON, indented, with a line break at its end. */
export const jsonText = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export const cvNames = async () => (await home.list('cvs', '.json')).map(file => file.stem);
export const profileNames = async () =>
  (await home.list('profiles', '.json')).map(file => file.stem);
