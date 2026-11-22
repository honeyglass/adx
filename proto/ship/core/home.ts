// The data folder, ~/.ship, which --home and SHIP_HOME move.
import { envDir, root } from '@honeyglass/adx';

export const home = root('home', envDir('SHIP_HOME'));
