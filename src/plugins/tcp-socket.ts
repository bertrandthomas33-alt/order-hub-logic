/**
 * Stub plugin TCP Socket pour environnement web.
 * En production Capacitor, remplacer par un vrai plugin natif (@capacitor-community/tcp-socket).
 * Sur web, toutes les opérations échouent proprement — la modale TPE affichera "non connecté".
 */

interface ConnectOptions {
  host: string;
  port: number;
  timeout?: number;
}

interface SocketRef {
  socketId: string;
}

interface SendOptions extends SocketRef {
  data: string; // base64
}

interface ReceiveOptions extends SocketRef {
  timeout?: number;
}

interface ReceiveResult {
  length: number;
  data: string; // base64
}

interface IsConnectedResult {
  connected: boolean;
}

const NOT_AVAILABLE_MSG =
  'TCP Socket natif indisponible en environnement web. Nécessite un build Capacitor (iOS/Android) avec @capacitor-community/tcp-socket.';

export const TcpSocket = {
  async connect(_opts: ConnectOptions): Promise<SocketRef> {
    throw new Error(NOT_AVAILABLE_MSG);
  },
  async disconnect(_opts: SocketRef): Promise<void> {
    return;
  },
  async send(_opts: SendOptions): Promise<void> {
    throw new Error(NOT_AVAILABLE_MSG);
  },
  async receive(_opts: ReceiveOptions): Promise<ReceiveResult> {
    return { length: 0, data: '' };
  },
  async isConnected(_opts: SocketRef): Promise<IsConnectedResult> {
    return { connected: false };
  },
};
