import xmlbuilder from "xmlbuilder";
import XMLParser from "xml-parser";
import logger from "../../utilites/appLogger";
import XmppSessionRegistry from "../../utilites/xmppRegistry";
import processMatchmakerSocket from "../matchmaker/matchmakerEngine";

export function handleSocketStream(ws: any, req?: Request) {
  let isXmppProtocol = false;
  let isAuthenticated = false;
  let accountId = "";
  let jid = "";
  let id = "";
  let resource = "";
  const framingSessionId = crypto.randomUUID().replace(/-/g, "");

  const subprotocol = ws.protocol || (req ? req.headers.get("sec-websocket-protocol") : "");
  if (subprotocol && subprotocol.toLowerCase().includes("xmpp")) {
    isXmppProtocol = true;
  }

  let matchmakerStarted = false;

  return {
    onMessage: async (incoming: string | Buffer) => {
      const payloadString = typeof incoming === "string" ? incoming : incoming.toString("utf-8");

      if (payloadString.trim().startsWith("{") || payloadString.trim().startsWith("[")) {
        if (!matchmakerStarted) {
          matchmakerStarted = true;
          processMatchmakerSocket(ws);
        }
        return;
      }

      let parsedXml: any;
      try {
        parsedXml = XMLParser(payloadString);
      } catch {
        return;
      }

      if (!parsedXml || !parsedXml.root) {
        if (!matchmakerStarted) {
          matchmakerStarted = true;
          processMatchmakerSocket(ws);
        }
        return;
      }

      isXmppProtocol = true;
      const root = parsedXml.root;

      switch (root.name) {
        case "open": {
          ws.send(
            xmlbuilder
              .create("open")
              .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-framing")
              .attribute("from", "prod.ol.epicgames.com")
              .attribute("id", framingSessionId)
              .attribute("version", "1.0")
              .attribute("xml:lang", "en")
              .toString()
          );

          if (isAuthenticated) {
            ws.send(
              xmlbuilder
                .create("stream:features")
                .attribute("xmlns:stream", "http://etherx.jabber.org/streams")
                .element("ver")
                .attribute("xmlns", "urn:xmpp:features:rosterver")
                .up()
                .element("starttls")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls")
                .up()
                .element("bind")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind")
                .up()
                .element("compression")
                .attribute("xmlns", "http://jabber.org/features/compress")
                .element("method", "zlib")
                .up()
                .up()
                .element("session")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-session")
                .up()
                .toString()
            );
          } else {
            ws.send(
              xmlbuilder
                .create("stream:features")
                .attribute("xmlns:stream", "http://etherx.jabber.org/streams")
                .element("mechanisms")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
                .element("mechanism", "PLAIN")
                .up()
                .up()
                .element("ver")
                .attribute("xmlns", "urn:xmpp:features:rosterver")
                .up()
                .element("starttls")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-tls")
                .up()
                .element("compression")
                .attribute("xmlns", "http://jabber.org/features/compress")
                .element("method", "zlib")
                .up()
                .up()
                .element("auth")
                .attribute("xmlns", "http://jabber.org/features/iq-auth")
                .up()
                .toString()
            );
          }
          break;
        }

        case "auth": {
          const content = root.content;
          if (!content) return;

          try {
            const rawDecoded = Buffer.from(content, "base64").toString("utf-8");
            const segments = rawDecoded.split("\u0000");
            accountId = segments[1] || segments[0];

            if (accountId) {
              isAuthenticated = true;
              ws.send(
                xmlbuilder
                  .create("success")
                  .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-sasl")
                  .toString()
              );
            }
          } catch (err: any) {
            logger.error(`SASL auth parsing error: ${err.message}`);
          }
          break;
        }

        case "iq": {
          const stanzaId = root.attributes?.id || "";

          if (stanzaId === "_xmpp_bind1") {
            const bindNode = root.children?.find((c: any) => c.name === "bind");
            const resNode = bindNode?.children?.find((c: any) => c.name === "resource");
            resource = resNode?.content || "V2:Fortnite:WIN::" + crypto.randomUUID().replace(/-/g, "");
            jid = `${accountId}@prod.ol.epicgames.com/${resource}`;
            id = `${accountId}@prod.ol.epicgames.com`;

            ws.send(
              xmlbuilder
                .create("iq")
                .attribute("to", jid)
                .attribute("id", "_xmpp_bind1")
                .attribute("xmlns", "jabber:client")
                .attribute("type", "result")
                .element("bind")
                .attribute("xmlns", "urn:ietf:params:xml:ns:xmpp-bind")
                .element("jid", jid)
                .up()
                .up()
                .toString()
            );

            XmppSessionRegistry.registerPeer({
              ws,
              accountId,
              jid,
              id,
              resource,
              lastPresence: { status: "{}", away: false },
            });
          } else if (stanzaId === "_xmpp_session1") {
            ws.send(
              xmlbuilder
                .create("iq")
                .attribute("to", jid)
                .attribute("from", "prod.ol.epicgames.com")
                .attribute("id", "_xmpp_session1")
                .attribute("xmlns", "jabber:client")
                .attribute("type", "result")
                .toString()
            );
          } else {
            ws.send(
              xmlbuilder
                .create("iq")
                .attribute("to", jid)
                .attribute("from", "prod.ol.epicgames.com")
                .attribute("id", stanzaId)
                .attribute("xmlns", "jabber:client")
                .attribute("type", "result")
                .toString()
            );
          }
          break;
        }

        case "message": {
          const bodyElem = root.children?.find((c: any) => c.name === "body");
          const body = bodyElem?.content || "";
          const target = root.attributes?.to || "";
          const type = root.attributes?.type;

          if (type === "chat" && target) {
            const receiverAccountId = target.split("@")[0];
            const sender = XmppSessionRegistry.locatePeer(accountId);
            if (sender) {
              XmppSessionRegistry.relayPrivateChatMessage(sender, receiverAccountId, body);
            }
          }
          break;
        }

        case "presence": {
          const statusNode = root.children?.find((c: any) => c.name === "status");
          const showNode = root.children?.find((c: any) => c.name === "show");
          const status = statusNode?.content || "{}";
          const away = !!showNode;

          const peer = XmppSessionRegistry.locatePeer(accountId);
          if (peer) {
            peer.lastPresence = { status, away };
            XmppSessionRegistry.broadcastPresenceUpdate(peer, status, away, false);
          }
          break;
        }
      }
    },
    onClose: () => {
      if (isXmppProtocol) {
        XmppSessionRegistry.unregisterPeer(ws);
      }
    },
  };
}

export default handleSocketStream;
