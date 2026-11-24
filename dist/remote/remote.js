import { made } from "./address.js";
import { read, request } from "./exchange.js";
export function remote(name, at) {
    const server = new Server();
    made(server, { name, url: at.url, auth: at.auth });
    return server;
}
class Server {
    get(path, answer, options = {}) {
        return read(this, path, answer, options);
    }
    post(path, body) {
        return request('POST', { remote: this, path, body });
    }
    put(path, body) {
        return request('PUT', { remote: this, path, body });
    }
    patch(path, body) {
        return request('PATCH', { remote: this, path, body });
    }
    delete(path) {
        return request('DELETE', { remote: this, path, body: undefined });
    }
}
