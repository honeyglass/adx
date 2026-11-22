// The server every feature talks to.
import { bearer, envUrl, remote } from '@honeyglass/adx';

export const api = remote('ship', {
  url: envUrl('SHIP_URL', 'https://ship.example.com/api'),
  auth: bearer('SHIP_TOKEN'),
});
