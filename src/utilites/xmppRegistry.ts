import xmlbuilder from "xmlbuilder";
import logger from "./appLogger";

export interface ConnectedXmppPeer {
  ws: any;
  accountId: string;
  jid: string;
  id: string;
  resource: string;
  lastPresence: {
    status: string;
    away: boolean;
  };
}

const activePeerPool: ConnectedXmppPeer[] = [];

export class XmppSessionRegistry {
  static getPeers(): ConnectedXmppPeer[] {
    return activePeerPool;
  }

  static registerPeer(peer: ConnectedXmppPeer) {
    const existingIndex = activePeerPool.findIndex((c) => c.accountId === peer.accountId);
    if (existingIndex !== -1) {
      try {
        activePeerPool[existingIndex].ws.close();
      } catch {}
      activePeerPool.splice(existingIndex, 1);
    }
    activePeerPool.push(peer);
    logger.info(`XMPP client connected: ${peer.accountId} (${peer.jid})`);
  }

  static unregisterPeer(ws: any) {
    const index = activePeerPool.findIndex((c) => c.ws === ws);
    if (index !== -1) {
      const removed = activePeerPool[index];
      activePeerPool.splice(index, 1);
      logger.info(`XMPP client disconnected: ${removed.accountId}`);
      this.broadcastPresenceUpdate(removed, "{}", false, true);
    }
  }

  static locatePeer(accountId: string): ConnectedXmppPeer | undefined {
    return activePeerPool.find((c) => c.accountId === accountId);
  }

  static dispatchPayloadToAccountId(accountId: string, payload: any): boolean {
    const peer = this.locatePeer(accountId);
    if (!peer) return false;

    const bodyText = typeof payload === "string" ? payload : JSON.stringify(payload);
    const xml = xmlbuilder
      .create("message")
      .attribute("from", "prod.ol.epicgames.com")
      .attribute("to", peer.jid)
      .attribute("xmlns", "jabber:client")
      .element("body", bodyText)
      .up()
      .toString();

    try {
      peer.ws.send(xml);
      return true;
    } catch {
      return false;
    }
  }

  static relayPrivateChatMessage(origin: ConnectedXmppPeer, recipientAccountId: string, bodyContent: string): boolean {
    const targetPeer = this.locatePeer(recipientAccountId);
    if (!targetPeer) return false;

    const xml = xmlbuilder
      .create("message")
      .attribute("to", targetPeer.jid)
      .attribute("from", origin.jid)
      .attribute("xmlns", "jabber:client")
      .attribute("type", "chat")
      .element("body", bodyContent)
      .up()
      .toString();

    try {
      targetPeer.ws.send(xml);
      return true;
    } catch {
      return false;
    }
  }

  static broadcastPresenceUpdate(sender: ConnectedXmppPeer, statusText: string, isAway: boolean = false, isOffline: boolean = false) {
    for (const peer of activePeerPool) {
      if (peer.accountId !== sender.accountId) {
        try {
          const xml = xmlbuilder
            .create("presence")
            .attribute("to", peer.jid)
            .attribute("from", sender.jid)
            .attribute("xmlns", "jabber:client");

          if (isOffline) {
            xml.attribute("type", "unavailable");
          } else {
            if (isAway) xml.element("show", "away").up();
            xml.element("status", statusText).up();
          }

          peer.ws.send(xml.toString());
        } catch {}
      }
    }
  }
}

export default XmppSessionRegistry;
