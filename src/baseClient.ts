import * as net from "net";

export default class RPCClient {
  constructor(public socketPath: string) {}
  protected call<ReturnType = unknown>(
    method: string,
    params = null
  ): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      let client = net.createConnection(this.socketPath);
      let payload = {
        method: method,
        params: params,
        id: 0,
      };
      client.write(JSON.stringify(payload));

      client.on("connect", () => {
        console.debug("ON CONNECT connected!");
      });

      client.on("data", (data) => {
        console.debug("ON DATA ", data.toString("utf8"));
        client.end();
        try {
          JSON.parse(data.toString("utf8"));
          return resolve(JSON.parse(data.toString("utf8")) as ReturnType);
        } catch {
          return resolve(data.toString("utf8") as unknown as ReturnType);
        }
      });
    });
  }
}
