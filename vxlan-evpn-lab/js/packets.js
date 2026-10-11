/* Hand-authored, Wireshark-style packets. Field values are realistic but SIMULATED, not captured. */
const P = (() => {
  const smac = (a, b) => `00:3a:7d:${hx(DEV[a].idx)}:${hx(DEV[b].idx)}:01`; // MAC of a's interface facing b
  const f = (k, v, o) => Object.assign({ k, v }, o || {});
  const L = (name, fields) => ({ name, fields });
  const ifname = (a, b) => `${DEV[a].name} ${portOf(a, b)} ↔ ${DEV[b].name} ${portOf(b, a)}`;
  const GWM = '00:00:22:22:33:33';                  // anycast gateway MAC
  const VM_MAC = '00:50:56:aa:10:50', VM_IP = '10.1.10.50';
  const ESI = '03:00:00:00:00:00:10:00:00:0a';       // Type-3 ESI: system-mac 0000.0000.0010, ES 10

  const FRAME = (len, a, b) => L(`Frame {n}: ${len} bytes on wire (${len * 8} bits)`, [
    f('Interface id', `0 (${ifname(a, b)})`), f('Encapsulation type', 'Ethernet (1)'), f('Frame Length', `${len} bytes`)]);
  const ETH = (s, d, type, hl) => L(`Ethernet II, Src: ${s}, Dst: ${d}`, [
    f('Destination', d, hl), f('Source', s), f('Type', type || 'IPv4 (0x0800)')]);
  const IP = (s, d, proto, ttl, total, o) => L(`Internet Protocol Version 4, Src: ${s}, Dst: ${d}`, [
    f('Version', '4'), f('Header Length', '20 bytes (5)'), f('Differentiated Services', '0xc0 (DSCP: CS6)'),
    f('Total Length', String(total)), f('Time to Live', String(ttl), o && o.ttl ? { hl: true, note: o.ttl } : null),
    f('Protocol', proto), f('Source Address', s), f('Destination Address', d)]);
  const TCP = (sp, dp, flags, len, extra) => L(`Transmission Control Protocol, Src Port: ${sp}, Dst Port: ${dp}, Len: ${len}`, [
    f('Source Port', String(sp)), f('Destination Port', String(dp)), f('TCP Segment Len', String(len)), f('Flags', flags)].concat(extra || []));
  const BGPH = (type, len) => [f('Marker', 'ffffffffffffffffffffffffffffffff'), f('Length', String(len)), f('Type', type)];

  // 'under' = directly connected /31, 'over' = loopback0 ↔ loopback0 (iBGP), 'ext' = border ↔ WAN /31
  function ctx(a, b, mode) {
    const base = { smac: smac(a, b), dmac: smac(b, a) };
    if (mode === 'under') {
      const leaf = DEV[a].kind === 'spine' ? b : a, spine = DEV[a].kind === 'spine' ? a : b;
      const u = UPL[leaf].find(x => x.spine === spine);
      const aIsLeaf = a === leaf;
      return Object.assign(base, { sip: aIsLeaf ? u.ip : u.peer, dip: aIsLeaf ? u.peer : u.ip, ttl: 1 });
    }
    if (mode === 'ext') return Object.assign(base, { sip: EXT[a], dip: EXT[b], ttl: 1 });
    return Object.assign(base, { sip: DEV[a].lo0, dip: DEV[b].lo0, ttl: 255 });
  }
  const out = (a, b, pk) => Object.assign({ link: [a, b] }, pk);
  const sport = mode => (mode === 'over' ? 50201 : mode === 'ext' ? 50301 : 50123);

  function wrap(a, b, c, tcpPart, bl, proto, info, key, bgpLayer, o) {
    const len = 14 + 20 + 20 + bl;
    const layers = [FRAME(len, a, b), ETH(c.smac, c.dmac), IP(c.sip, c.dip, 'TCP (6)', c.ttl, 40 + bl, o && o.ipHl), tcpPart];
    if (bgpLayer) layers.push(bgpLayer);
    return out(a, b, { src: c.sip, dst: c.dip, proto, len, info, layers, key: !!key });
  }
  const mcMac = ip => { const p = ip.split('.').map(Number); return `01:00:5e:${hx(p[1] & 0x7f)}:${hx(p[2])}:${hx(p[3])}`; };

  const P_ = {
    /* ---------------------------------------------------------- TCP */
    tcpSyn(a, b, mode, key, sp) {
      const c = ctx(a, b, mode); sp = sp || sport(mode);
      const len = 14 + 20 + 24;
      return out(a, b, { src: c.sip, dst: c.dip, proto: 'TCP', len, tag: 'syn', key: !!key,
        info: `${sp} → 179 [SYN] Seq=0 Win=16384 Len=0 MSS=1460`,
        layers: [FRAME(len, a, b), ETH(c.smac, c.dmac), IP(c.sip, c.dip, 'TCP (6)', c.ttl, 44), TCP(sp, 179, '0x002 (SYN)', 0, [f('Options', 'MSS 1460')])] });
    },
    tcpRst(a, b, mode, key, sp) {
      const c = ctx(a, b, mode); sp = sp || sport(mode);
      const len = 14 + 20 + 20;
      return out(a, b, { src: c.sip, dst: c.dip, proto: 'TCP', len, tag: 'rst', key: !!key,
        info: `179 → ${sp} [RST, ACK] Seq=1 Ack=1 Win=0 Len=0`,
        layers: [FRAME(len, a, b), ETH(c.smac, c.dmac), IP(c.sip, c.dip, 'TCP (6)', c.ttl, 40),
          TCP(179, sp, '0x014 (RST, ACK)', 0, [f('Meaning', 'Nothing is listening on TCP/179 — the neighbour has no BGP session configured for us', { hl: true })])] });
    },
    tcpSynAck(a, b, mode, sp) {
      const c = ctx(a, b, mode); sp = sp || sport(mode);
      const len = 14 + 20 + 24;
      return out(a, b, { src: c.sip, dst: c.dip, proto: 'TCP', len, tag: 'synack', info: `179 → ${sp} [SYN, ACK] Seq=0 Ack=1 Win=16384 Len=0 MSS=1460`,
        layers: [FRAME(len, a, b), ETH(c.smac, c.dmac), IP(c.sip, c.dip, 'TCP (6)', c.ttl, 44), TCP(179, sp, '0x012 (SYN, ACK)', 0)] });
    },
    tcpAck(a, b, mode, sp) {
      const c = ctx(a, b, mode); sp = sp || sport(mode);
      const len = 14 + 20 + 20;
      return out(a, b, { src: c.sip, dst: c.dip, proto: 'TCP', len, tag: 'ack', info: `${sp} → 179 [ACK] Seq=1 Ack=1 Win=16384 Len=0`,
        layers: [FRAME(len, a, b), ETH(c.smac, c.dmac), IP(c.sip, c.dip, 'TCP (6)', c.ttl, 40), TCP(sp, 179, '0x010 (ACK)', 0)] });
    },

    /* ---------------------------------------------------------- OSPF (underlay) */
    ospf(a, b, kind, o) {
      o = o || {};
      const c = ctx(a, b, 'under'), rid = DEV[a].lo0, peer = DEV[b].lo0;
      const types = { hello: ['Hello Packet (1)', 'Hello Packet', 64], dbd: ['DB Description (2)', 'DB Description', 52], lsu: ['LS Update (4)', 'LS Update', 100], ack: ['LS Acknowledge (5)', 'LS Acknowledge', 64] };
      const [tname, info, plen] = types[kind];
      const len = 14 + 20 + plen;
      const hdr = [f('Version', '2'), f('Message Type', tname), f('Packet Length', String(plen)), f('Source OSPF Router', rid),
        f('Area ID', '0.0.0.0 (Backbone)'), f('Auth Type', 'Null')];
      let body = [];
      if (kind === 'hello') {
        body = [f('Network Mask', '255.255.255.254', { note: 'A /31 — both ends must agree on the mask.' }), f('Hello Interval', '10 seconds'), f('Options', '0x02 (E)'),
          f('Router Priority', '1'), f('Router Dead Interval', '40 seconds'), f('Designated Router', '0.0.0.0', { note: 'No DR election on a point-to-point network (ip ospf network point-to-point) — faster adjacency, no Type-2 LSA.' }),
          f('Backup Designated Router', '0.0.0.0'),
          o.seen ? f('Active Neighbor', peer, { hl: true, note: 'We have heard the neighbour’s Hello and list it here → 2-Way. The neighbour sees itself in our Hello and moves on to ExStart.' })
                 : f('Active Neighbor', '(none)', { hl: true, note: 'Empty neighbour list = “I can’t hear anybody yet”. Spine has no OSPF → nobody replies.' })];
      } else if (kind === 'dbd') {
        body = [f('Interface MTU', '9216', { hl: true, note: 'MTU in the DBD must match on both ends or the adjacency sticks in ExStart/Exchange — a classic jumbo-frame trap.' }), f('Options', '0x02 (E)'),
          f('DB Description', 'Flags 0x07 (I, M, MS)'), f('DD Sequence', '4242')];
      } else if (kind === 'lsu') {
        body = [f('Number of LSAs', '1'), f('LSA-type 1 (Router-LSA)', '', { children: [f('Advertising Router', rid), f('Number of Links', '3'),
          f('Link: Point-to-point', `Neighbor ${peer}, metric 1`), f('Link: Stub', `${DEV[a].lo0}/32 (Loopback0)`, { hl: true, note: 'Loopbacks are advertised as stub /32s — this is how every VTEP address becomes reachable.' }),
          DEV[a].lo1 ? f('Link: Stub', `${DEV[a].lo1}/32 (Loopback1 / VTEP)`, { hl: true }) : f('Link: Stub', `${RP_IP}/32 (RP)`)] })];
      } else body = [f('LSA Header', `Router-LSA from ${peer}`)];
      const pk = out(a, b, { src: c.sip, dst: '224.0.0.5', proto: 'OSPF', len, tag: 'ospf-' + kind, key: !!o.key, info, keyField: kind === 'hello' ? 'Active Neighbor' : kind === 'dbd' ? 'Interface MTU' : 'Link: Stub',
        layers: [FRAME(len, a, b), ETH(c.smac, '01:00:5e:00:00:05'), IP(c.sip, '224.0.0.5', 'OSPF IGP (89)', 1, 20 + plen, { ttl: 'OSPF multicast stays on-link: TTL 1, dst 224.0.0.5 (AllSPFRouters).' }), L('Open Shortest Path First', hdr.concat(body))] });
      return pk;
    },

    /* ---------------------------------------------------------- PIM (multicast BUM underlay) */
    pimHello(a, b, key) {
      const c = ctx(a, b, 'under'); const len = 14 + 20 + 30;
      return out(a, b, { src: c.sip, dst: '224.0.0.13', proto: 'PIMv2', len, tag: 'pim', key: !!key, info: 'Hello', keyField: 'Option 1: Hold Time',
        layers: [FRAME(len, a, b), ETH(c.smac, '01:00:5e:00:00:0d'), IP(c.sip, '224.0.0.13', 'PIM (103)', 1, 50, { ttl: 'PIM control traffic is link-local: dst 224.0.0.13 (ALL-PIM-ROUTERS), TTL 1.' }),
          L('Protocol Independent Multicast', [f('Version', '2'), f('Type', 'Hello (0)'), f('Option 1: Hold Time', '105 seconds', { hl: true, note: 'PIM neighbours are discovered by Hellos on every PIM-enabled interface, including the VTEP loopback’s uplinks.' }),
            f('Option 19: DR Priority', '1'), f('Option 20: Generation ID', '0x5a0e1c2b')])] });
    },
    pimJoin(a, b, key) {
      const c = ctx(a, b, 'under'); const len = 14 + 20 + 34;
      return out(a, b, { src: c.sip, dst: '224.0.0.13', proto: 'PIMv2', len, tag: 'pim', key: !!key, info: `Join/Prune  (*,${MCG}) Join`, keyField: 'Group',
        layers: [FRAME(len, a, b), ETH(c.smac, '01:00:5e:00:00:0d'), IP(c.sip, '224.0.0.13', 'PIM (103)', 1, 54),
          L('Protocol Independent Multicast', [f('Version', '2'), f('Type', 'Join/Prune (3)'), f('Upstream-neighbor', c.dip, { note: 'The spine (next hop toward the RP).' }),
            f('Groups', '', { children: [f('Group', `${MCG}/32`, { hl: true, note: 'The VNI’s BUM group. Every VTEP with VNI 10010 joins it → a shared tree rooted at the RP.' }), f('Join (*,G)', `RP ${RP_IP}  flags: S, WC, RPT`, { hl: true, note: 'Wildcard join toward the Anycast-RP address.' })] })])] });
    },

    /* ---------------------------------------------------------- BGP */
    bgpOpen(a, b, mode, o) {
      o = o || {};
      const c = ctx(a, b, mode); const evpn = !!o.evpn, ext = mode === 'ext';
      const caps = [
        evpn ? f('Capability: Multiprotocol extensions', 'AFI: L2VPN (25), SAFI: EVPN (70)', { hl: true, note: 'AFI 25 / SAFI 70 is how two routers agree to exchange EVPN. If either side omits it the session still comes up but no EVPN routes flow.' })
             : f('Capability: Multiprotocol extensions', 'AFI: IPv4 (1), SAFI: Unicast (1)'),
        f('Capability: Route Refresh', 'Cisco/standard'), f('Capability: 4-octet AS number', `AS: ${DEV[a].asn}`)];
      const myAs = f('My AS', String(DEV[a].asn), o.keyAs ? { hl: true, note: ext ? `AS ${DEV[a].asn} ≠ ${DEV[b].asn}: external BGP (eBGP) to the WAN.` : 'My AS = peer’s AS (65000) → this is iBGP. No AS-path prepending, and routes learned from an iBGP peer are not re-advertised to other iBGP peers — which is exactly why the spines are route reflectors.' } : null);
      const bgp = L('Border Gateway Protocol - OPEN Message', BGPH('OPEN Message (1)', 49).concat([f('Version', '4'), myAs, f('Hold Time', '180 seconds'),
        f('BGP Identifier', DEV[a].lo0 || EXT[a], { note: 'The router-id.' }), f('Optional Parameters Length', '20'), f('Optional Parameters', '', { children: caps })]));
      const pk = wrap(a, b, c, TCP(sport(mode), 179, '0x018 (PSH, ACK)', 49), 49, 'BGP', 'OPEN Message', o.key, bgp, mode === 'over' ? { ipHl: { ttl: 'iBGP between loopbacks: Cisco sets TTL 255, no ebgp-multihop needed.' } } : null);
      pk.keyField = evpn ? 'Capability: Multiprotocol extensions' : 'My AS'; pk.tag = 'open';
      return pk;
    },
    bgpKeepalive(a, b, mode, key) {
      const c = ctx(a, b, mode);
      const pk = wrap(a, b, c, TCP(sport(mode), 179, '0x018 (PSH, ACK)', 19), 19, 'BGP', 'KEEPALIVE Message', key, L('Border Gateway Protocol - KEEPALIVE Message', BGPH('KEEPALIVE Message (4)', 19)));
      pk.tag = 'keepalive'; return pk;
    },
    bgpUpdateV4(a, b, prefixes, nh, aspath, key) {   // eBGP border ↔ WAN (IPv4 unicast in the tenant VRF)
      const c = ctx(a, b, 'ext');
      const bl = 19 + 4 + 4 + 8 + 7 + prefixes.length * 5;
      const bgp = L('Border Gateway Protocol - UPDATE Message', BGPH('UPDATE Message (2)', bl).concat([f('Withdrawn Routes Length', '0'),
        f('Path attributes', '', { children: [f('Path Attribute - ORIGIN', 'IGP'), f('Path Attribute - AS_PATH', aspath, { note: 'WAN prepends its own AS 65100 — the border sees an external route.' }), f('Path Attribute - NEXT_HOP', nh)] }),
        f('Network Layer Reachability Information (NLRI)', '', { children: prefixes.map(p => f('NLRI', p, { hl: true })) })]));
      const pk = wrap(a, b, c, TCP(sport('ext'), 179, '0x018 (PSH, ACK)', bl), bl, 'BGP', 'UPDATE Message', key, bgp);
      pk.keyField = 'NLRI'; pk.tag = 'update'; return pk;
    },
    // type: '1ES' | '1EVI' | 2 | '2IP' | 3 | 4 | 5
    bgpUpdateEvpn(a, b, type, o) {
      const c = ctx(a, b, 'over');
      const leaf = o.origin, vrfRd = `${DEV[leaf].lo0}:3`, rd = `${DEV[leaf].lo0}:32777`;
      const nhv = DEV[leaf].lo1, rt2 = f('Route Target', '65000:10010', { note: 'AS:VNI generated by “route-target … auto”. All leaves share AS 65000 (iBGP), so auto-RTs match — in an eBGP fabric with per-leaf AS numbers they would not.' });
      const rt3 = f('Route Target', '65000:50001', { note: 'L3VNI RT: decides which VRF (Tenant-A) imports this route.' });
      const encap = f('Encapsulation', 'VXLAN (8)', { note: 'Tunnel type 8 = VXLAN. The remote VTEP only tunnels with VXLAN if it sees this.' });
      const rmacF = f('Router’s MAC', rmac(leaf), { hl: true, note: 'The originating VTEP’s router MAC. The egress VTEP uses it as the INNER destination MAC when routing into the L3VNI.' });
      let nlri, kf, nlriLen, nExt = 2, pmsi = false;
      const ext = [];
      if (type === 3) {
        nlri = L('EVPN NLRI: Inclusive Multicast Route', [f('Route Type', 'Inclusive Multicast Ethernet Tag Route (3)', { hl: true }), f('Route Distinguisher', rd), f('Ethernet Tag ID', '0'), f('IP Address Length', '32'),
          f('IPv4 address', DEV[leaf].lo1, { hl: true, note: 'Originating router = this leaf’s VTEP loopback1.' })]);
        kf = 'Route Type'; nlriLen = 19; ext.push(rt2, encap); pmsi = true;
      } else if (type === 2) {
        nlri = L('EVPN NLRI: MAC Advertisement Route', [f('Route Type', 'MAC Advertisement Route (2)', { hl: true }), f('Route Distinguisher', rd),
          f('ESI', ESI, { note: 'Non-zero ESI → this MAC lives behind a multihomed Ethernet Segment.' }), f('Ethernet Tag ID', '0'), f('MAC Address Length', '48'), f('MAC Address', DEV.host.mac, { hl: true }),
          f('IP Address Length', '0', { note: 'MAC-only: learned from a non-ARP frame. Chapter 6 adds the IP once the host ARPs the gateway.' }), f('MPLS Label 1 (L2VNI)', '10010', { hl: true, note: 'The label field carries the L2VNI in VXLAN EVPN.' })]);
        kf = 'MAC Address'; nlriLen = 35; ext.push(rt2, encap);
      } else if (type === '2IP') {
        nlri = L('EVPN NLRI: MAC Advertisement Route (MAC+IP)', [f('Route Type', 'MAC Advertisement Route (2)', { hl: true }), f('Route Distinguisher', rd), f('ESI', ESI), f('Ethernet Tag ID', '0'),
          f('MAC Address Length', '48'), f('MAC Address', DEV.host.mac), f('IP Address Length', '32'), f('IPv4 address', DEV.host.ip, { hl: true, note: 'MAC+IP → remote leaves can install a /32 host route in the VRF and answer ARP locally.' }),
          f('MPLS Label 1 (L2VNI)', '10010', { hl: true, note: 'Bridging uses this VNI.' }), f('MPLS Label 2 (L3VNI)', '50001', { hl: true, note: 'Routing uses this VNI — the hallmark of symmetric IRB: a Type-2 carries BOTH labels.' })]);
        kf = 'MPLS Label 2 (L3VNI)'; nlriLen = 42; ext.push(rt2, rt3, encap, rmacF); nExt = 4;
      } else if (type === 'VM') {
        const mob = o.seq ? f('MAC Mobility Sequence', String(o.seq), { hl: true, note: 'The move counter. A MAC that has never moved carries no such attribute (= 0). The new owner advertises old + 1; every VTEP prefers the HIGHEST sequence number, so the old location loses.' }) : null;
        nlri = L('EVPN NLRI: MAC Advertisement Route (MAC+IP)', [f('Route Type', 'MAC Advertisement Route (2)', { hl: true }), f('Route Distinguisher', rd),
          f('ESI', '00:00:00:00:00:00:00:00:00:00', { note: 'All-zero ESI: single-homed. This VM sits behind one leaf, not an Ethernet Segment.' }), f('Ethernet Tag ID', '0'),
          f('MAC Address Length', '48'), f('MAC Address', VM_MAC, { hl: !o.seq }), f('IP Address Length', '32'), f('IPv4 address', VM_IP, { hl: true }),
          f('MPLS Label 1 (L2VNI)', '10010'), f('MPLS Label 2 (L3VNI)', '50001')]);
        kf = o.seq ? 'MAC Mobility Sequence' : 'MAC Address'; nlriLen = 42; ext.push(rt2, rt3, encap, rmacF); if (mob) ext.push(mob); nExt = 4 + (mob ? 1 : 0);
      } else if (type === 4) {
        nlri = L('EVPN NLRI: Ethernet Segment Route', [f('Route Type', 'Ethernet Segment Route (4)', { hl: true }), f('Route Distinguisher', `${DEV[leaf].lo0}:3`),
          f('ESI', ESI, { hl: true, note: 'Type 3 ESI = 03 + system-mac (00:00:00:00:00:10) + local discriminator (0x00000a = ES 10).' }), f('IP Address Length', '32'), f('Originating Router', DEV[leaf].lo1)]);
        kf = 'ESI'; nlriLen = 25; ext.push(f('ES-Import Route Target', '00:00:00:00:00:10', { hl: true, note: 'Derived from the ESI. Only leaves attached to the same ES import Type-4 routes → they discover each other and run DF election.' })); nExt = 1;
      } else if (type === '1ES') {
        nlri = L('EVPN NLRI: Ethernet AD Route (per-ES)', [f('Route Type', 'Ethernet AD Route (1)', { hl: true }), f('Route Distinguisher', `${DEV[leaf].lo0}:3`), f('ESI', ESI),
          f('Ethernet Tag ID', '0xffffffff', { hl: true, note: 'MAX-ET (all ones) = applies to the whole Ethernet Segment — used for fast mass-withdrawal when the ES goes down.' }), f('MPLS Label', '0')]);
        kf = 'Ethernet Tag ID'; nlriLen = 27; ext.push(rt2, f('ESI Label', 'flags 0x00 (all-active), label 0', { note: 'Split-horizon label (MPLS use). VXLAN uses local-bias instead.' })); nExt = 2;
      } else if (type === '1EVI') {
        nlri = L('EVPN NLRI: Ethernet AD Route (per-EVI)', [f('Route Type', 'Ethernet AD Route (1)', { hl: true }), f('Route Distinguisher', rd), f('ESI', ESI), f('Ethernet Tag ID', '0'),
          f('MPLS Label', '10010', { hl: true, note: 'Per-EVI AD route: “I can reach this ES for VNI 10010” → enables aliasing (load-balance to either leaf).' })]);
        kf = 'MPLS Label'; nlriLen = 27; ext.push(rt2); nExt = 1;
      } else {   // 5
        nlri = L('EVPN NLRI: IP Prefix route', [f('Route Type', 'IP Prefix route (5)', { hl: true }), f('Route Distinguisher', vrfRd), f('ESI', '00:00:00:00:00:00:00:00:00:00'), f('Ethernet Tag ID', '0'),
          f('IP prefix length', String(o.plen)), f('IPv4 address', o.prefix, { hl: true, note: o.prefix === '0.0.0.0' ? 'The default route, injected into the fabric by the border leaf.' : 'A whole subnet/prefix — not a host. Used for subnets, default routes and external routes.' }),
          f('GW IP address', '0.0.0.0'), f('MPLS Label', '50001', { hl: true, note: 'The L3VNI of VRF Tenant-A — Type-5 routes always use the L3VNI.' })]);
        kf = 'IPv4 address'; nlriLen = 36; ext.push(rt3, encap, rmacF); nExt = 3;
      }
      const attrs = [f('Path Attribute - ORIGIN', 'IGP'), f('Path Attribute - AS_PATH', 'empty', { note: 'iBGP: nothing prepended inside AS 65000.' }), f('Path Attribute - LOCAL_PREF', '100')];
      if (o.reflected) attrs.push(f('Path Attribute - ORIGINATOR_ID', DEV[leaf].lo0, { hl: true, note: 'Added by the route reflector: the router that really originated the route (loop prevention).' }),
        f('Path Attribute - CLUSTER_LIST', DEV[a].lo0, { hl: true, note: 'The RR’s cluster-id (defaults to its router-id). A reflector drops routes that already carry its own cluster-id.' }));
      attrs.push(f('Path Attribute - MP_REACH_NLRI', '', { children: [f('Address family', 'L2VPN (25), SAFI: EVPN (70)'),
        f('Next hop', nhv, { hl: !!o.reflected, note: o.reflected ? 'UNCHANGED: a route reflector never rewrites the next hop for iBGP, so remote leaves tunnel straight to the originating VTEP (10.1.1.x), not to the spine.' : 'The originating leaf’s NVE source-interface (loopback1) — the VXLAN tunnel endpoint.' }),
        f('NLRI', '', { children: [nlri] })] }));
      attrs.push(f('Path Attribute - EXTENDED_COMMUNITIES', '', { children: ext }));
      if (pmsi) attrs.push(f('Path Attribute - PMSI_TUNNEL', '', MC() ? { children: [
        f('Tunnel Type', 'PIM-SM Tree (4)', { hl: true, note: 'Multicast mode: BUM rides the underlay multicast tree. (Representative — NX-OS still advertises the IMET route for VTEP discovery.)' }), f('VNI', '10010'), f('Tunnel ID', MCG)] } : { children: [
        f('Tunnel Type', 'Ingress Replication (6)', { hl: true, note: 'Head-end replication: BUM traffic is copied to each advertised VTEP as a separate unicast VXLAN packet.' }), f('VNI', '10010'), f('Tunnel ID', DEV[leaf].lo1)] }));
      const attrLen = 4 + 3 + 7 + (o.reflected ? 14 : 0) + (12 + nlriLen) + (3 + 8 * nExt) + (pmsi ? 12 : 0);
      const bl = 19 + 4 + attrLen;
      const label = { 3: 'Type-3 IMET', 2: 'Type-2 MAC', '2IP': 'Type-2 MAC+IP', 4: 'Type-4 ES', '1ES': 'Type-1 per-ES', '1EVI': 'Type-1 per-EVI', VM: 'Type-2 MAC+IP (VM)', 5: 'Type-5 prefix' }[type];
      const bgp = L('Border Gateway Protocol - UPDATE Message', BGPH('UPDATE Message (2)', bl).concat([f('Path attributes', '', { children: attrs })]));
      const pk = wrap(a, b, c, TCP(50201, 179, '0x018 (PSH, ACK)', bl), bl, 'BGP', `UPDATE Message  [EVPN ${label}]`, o.key, bgp);
      pk.keyField = kf; if (o.seq) pk.seq = o.seq; pk.tag = 'evpn' + type; pk.rtype = String(type).replace('2IP', '2').replace('VM', '2').replace('1ES', '1').replace('1EVI', '1');
      return pk;
    },

    // withdrawal (MP_UNREACH_NLRI): type '1ES' | 'VM'
    bgpWithdraw(a, b, type, o) {
      const c = ctx(a, b, 'over'), leaf = o.origin;
      const nl = type === '1ES'
        ? L('EVPN NLRI: Ethernet AD Route (per-ES)', [f('Route Type', 'Ethernet AD Route (1)', { hl: true }), f('Route Distinguisher', `${DEV[leaf].lo0}:3`), f('ESI', ESI),
            f('Ethernet Tag ID', '0xffffffff', { hl: true, note: 'MASS WITHDRAWAL: this one route stands for every MAC behind the segment. Withdraw it and remote leaves drop this leaf as a next hop for ALL of them at once, without waiting for thousands of Type-2 withdrawals.' })])
        : L('EVPN NLRI: MAC Advertisement Route (MAC+IP)', [f('Route Type', 'MAC Advertisement Route (2)', { hl: true }), f('Route Distinguisher', `${DEV[leaf].lo0}:32777`),
            f('MAC Address', VM_MAC, { hl: true, note: 'The OLD location withdraws the MAC after it sees the new, higher sequence number.' }), f('IPv4 address', VM_IP)]);
      const bl = 19 + 4 + 7 + (type === '1ES' ? 28 : 38);
      const bgp = L('Border Gateway Protocol - UPDATE Message', BGPH('UPDATE Message (2)', bl).concat([f('Withdrawn Routes Length', '0'), f('Path attributes', '', { children: [
        f('Path Attribute - MP_UNREACH_NLRI', '', { hl: true, children: [f('Address family', 'L2VPN (25), SAFI: EVPN (70)'), f('Withdrawn Routes', '', { children: [nl] })] })] })]));
      const pk = wrap(a, b, c, TCP(50201, 179, '0x018 (PSH, ACK)', bl), bl, 'BGP', `UPDATE Message  [EVPN withdraw ${type === '1ES' ? 'Type-1 per-ES' : 'Type-2 ' + VM_MAC}]`, o.key, bgp);
      pk.keyField = type === '1ES' ? 'Ethernet Tag ID' : 'MAC Address'; pk.tag = 'withdraw'; pk.rtype = type === '1ES' ? '1' : '2'; return pk;
    },
    // ARP for the VM 10.1.10.50: req = Host-A asks, rep = answered (by the leaf, from its suppression cache)
    arpVM(link, kind, key) {
      const a = link[0], b = link[1], len = 60, isReq = kind === 'req';
      const src = isReq ? DEV.host.mac : VM_MAC, dst = isReq ? 'ff:ff:ff:ff:ff:ff' : DEV.host.mac;
      return out(a, b, { src, dst, proto: 'ARP', len, key: !!key, tag: 'arp', keyField: 'Sender MAC address',
        info: isReq ? `Who has ${VM_IP}? Tell ${DEV.host.ip}` : `${VM_IP} is at ${VM_MAC}`,
        layers: [FRAME(len, a, b), ETH(src, dst, 'ARP (0x0806)'),
          L('Address Resolution Protocol (' + (isReq ? 'request' : 'reply') + ')', [f('Opcode', isReq ? 'request (1)' : 'reply (2)'),
            f('Sender MAC address', isReq ? DEV.host.mac : VM_MAC, { hl: !isReq, note: isReq ? '' : 'The VM’s REAL MAC, not the gateway MAC. Leaf-1 is not doing proxy-ARP with its own address; it answers on the VM’s behalf from the MAC/IP binding it learned from the Type-2 route.' }),
            f('Sender IP address', isReq ? DEV.host.ip : VM_IP), f('Target MAC address', isReq ? '00:00:00:00:00:00' : DEV.host.mac), f('Target IP address', isReq ? VM_IP : DEV.host.ip)])] });
    },

    /* ---------------------------------------------------------- ICMP / ARP / LACP */
    icmp(a, b, size, reply, key, srcIp, dstIp) {          // underlay link ping
      const lk = ctx(a, b, 'under');
      const sip = srcIp || lk.sip, dip = dstIp || lk.dip, len = 14 + 20 + 8 + size;
      return out(a, b, { src: sip, dst: dip, proto: 'ICMP', len, key: !!key, tag: 'icmp',
        info: reply ? 'Echo (ping) reply    id=0x0e1a, seq=1/256, ttl=254' : 'Echo (ping) request  id=0x0e1a, seq=1/256, ttl=64',
        layers: [FRAME(len, a, b), ETH(lk.smac, lk.dmac), IP(sip, dip, 'ICMP (1)', reply ? 254 : 64, 20 + 8 + size),
          L('Internet Control Message Protocol', [f('Type', reply ? '0 (Echo (ping) reply)' : '8 (Echo (ping) request)'), f('Code', '0'),
            f('Data', `${size} bytes`, { hl: !!key, note: size > 1400 ? `${len}-byte frame crossed the link with DF set → proves jumbo MTU works.` : '' })])] });
    },
    ping(a, b, o) {                                         // generic routed ping on a link (host/WAN side)
      const len = 14 + 20 + 8 + 56;
      return out(a, b, { src: o.sip, dst: o.dip, proto: 'ICMP', len, key: !!o.key, tag: 'icmp',
        info: `${o.reply ? 'Echo (ping) reply  ' : 'Echo (ping) request'}  id=0x0e1a, seq=1/256, ttl=${o.ttl}`,
        layers: [FRAME(len, a, b), ETH(o.smac, o.dmac, null, o.ethNote ? { hl: true, note: o.ethNote } : null), IP(o.sip, o.dip, 'ICMP (1)', o.ttl, 84, o.ttlNote ? { ttl: o.ttlNote } : null),
          L('Internet Control Message Protocol', [f('Type', o.reply ? '0 (Echo (ping) reply)' : '8 (Echo (ping) request)'), f('Code', '0')])] });
    },
    arp(link, kind, key) {
      const a = link[0], b = link[1], len = kind === 'req' ? 60 : 60;
      const isReq = kind === 'req';
      const src = isReq ? DEV.host.mac : GWM, dst = isReq ? 'ff:ff:ff:ff:ff:ff' : DEV.host.mac;
      return out(a, b, { src, dst, proto: 'ARP', len, key: !!key, tag: 'arp', keyField: 'Sender MAC address',
        info: isReq ? `Who has ${GW_IP}? Tell ${DEV.host.ip}` : `${GW_IP} is at ${GWM}`,
        layers: [FRAME(len, a, b), ETH(src, dst, 'ARP (0x0806)'),
          L('Address Resolution Protocol (' + (isReq ? 'request' : 'reply') + ')', [f('Opcode', isReq ? 'request (1)' : 'reply (2)'),
            f('Sender MAC address', isReq ? DEV.host.mac : GWM, { hl: !isReq, note: !isReq ? '' : 'The ANYCAST gateway MAC — identical on every leaf. Wherever Host-A moves or hashes, the same MAC answers.' }),
            f('Sender IP address', isReq ? DEV.host.ip : GW_IP), f('Target MAC address', isReq ? '00:00:00:00:00:00' : DEV.host.mac), f('Target IP address', isReq ? GW_IP : DEV.host.ip)])] });
    },
    lacp(dev, sysMac, partnerMac, link, key) {
      const other = link[0] === dev ? link[1] : link[0];
      const src = dev === 'host' ? DEV.host.mac : smac(dev, other);
      const act = dev === 'host' ? 'Host-A bond0' : DEV[dev].name;
      return out(link[0], link[1], { src, dst: '01:80:c2:00:00:02', proto: 'LACP', len: 124, key: !!key, tag: 'lacp', keyField: 'Actor System',
        info: `Link Aggregation Control Protocol — actor ${act}`,
        layers: [FRAME(124, link[0], link[1]), ETH(src, '01:80:c2:00:00:02', 'Slow Protocols (0x8809)'),
          L('Link Aggregation Control Protocol', [f('LACP Version', '0x01'),
            f('Actor Information', '', { children: [f('Actor System Priority', '32768'),
              f('Actor System', sysMac, { hl: true, note: dev === 'host' ? 'Host’s bond MAC.' : 'IDENTICAL on Leaf-1 and Leaf-2 (evpn multihoming → system-mac 0000.0000.0010). The host believes it talks to ONE switch.' }),
              f('Actor Key', '10'), f('Actor Port', dev === 'host' ? '1' : '16385'), f('Actor State', '0x3d (Activity, Aggregation, Synchronization, Collecting, Distributing)')] }),
            f('Partner Information', '', { children: [f('Partner System', partnerMac)] })])] });
    },
    garp(link, key) {
      const a = link[0], b = link[1], len = 60;
      return out(a, b, { src: DEV.host.mac, dst: 'ff:ff:ff:ff:ff:ff', proto: 'ARP', len, key: !!key, tag: 'garp', keyField: 'Sender MAC address',
        info: 'Gratuitous ARP for 10.1.10.10 (Request)',
        layers: [FRAME(len, a, b), ETH(DEV.host.mac, 'ff:ff:ff:ff:ff:ff', 'ARP (0x0806)'),
          L('Address Resolution Protocol (request/gratuitous ARP)', [f('Opcode', 'request (1)'),
            f('Sender MAC address', DEV.host.mac, { hl: true, note: 'The switch learns THIS source MAC on port-channel10 in VLAN 10 — the seed of the Type-2 route.' }),
            f('Sender IP address', '10.1.10.10'), f('Target MAC address', '00:00:00:00:00:00'), f('Target IP address', '10.1.10.10')])] });
    },

    /* ---------------------------------------------------------- VXLAN data plane */
    vxlanGarp(a, spine, dstVtep, key) {                       // BUM, ingress replication: unicast copy per VTEP
      const sm = smac(a, spine), dm = smac(spine, a), len = 110, sp = dstVtep === DEV.leaf2.lo1 ? 52719 : 61034;
      return out(a, spine, { src: DEV[a].lo1, dst: dstVtep, proto: 'VXLAN', len, key: !!key, tag: 'vxlan',
        vx: { vni: 10010, osrc: DEV[a].lo1, odst: dstVtep, isrc: DEV.host.mac, idst: 'ff:ff:ff:ff:ff:ff', inner: 'ARP' },
        info: 'VNI 10010 │ Gratuitous ARP for 10.1.10.10 (Request)', keyField: 'VXLAN Network Identifier (VNI)',
        layers: vxl(a, spine, sm, dm, len, DEV[a].lo1, dstVtep, sp, 10010, 'unicast', ETH(DEV.host.mac, 'ff:ff:ff:ff:ff:ff', 'ARP (0x0806)'), garpBody()) });
    },
    vxlanGarpMc(a, spine, key) {                              // BUM, multicast: ONE packet to the group
      const sm = smac(a, spine), len = 110;
      return out(a, spine, { src: DEV[a].lo1, dst: MCG, proto: 'VXLAN', len, key: !!key, tag: 'vxlan',
        vx: { vni: 10010, osrc: DEV[a].lo1, odst: MCG, isrc: DEV.host.mac, idst: 'ff:ff:ff:ff:ff:ff', inner: 'ARP' },
        info: `VNI 10010 │ Gratuitous ARP  (outer dst = group ${MCG})`, keyField: 'Destination Address',
        layers: vxl(a, spine, sm, MCG_MAC, len, DEV[a].lo1, MCG, 52719, 10010, 'mcast', ETH(DEV.host.mac, 'ff:ff:ff:ff:ff:ff', 'ARP (0x0806)'), garpBody()) });
    },
    vxlanRouted(tx, spine, srcV, dstV, o) {                   // routed traffic in the L3VNI (symmetric IRB)
      const sm = smac(tx, spine), dm = smac(spine, tx), len = 148, sp = o.reply ? 49733 : 57311;
      const inner = [ETH(rmac(srcV), rmac(dstV), null, { hl: true, note: 'Inner MACs are the ROUTER MACs of the two VTEPs (from the Type-2/5 “Router’s MAC” extended community), not the host MACs.' }),
        IP(o.sip, o.dip, 'ICMP (1)', o.ttl, 84, { ttl: 'TTL already decremented by the INGRESS leaf’s routing hop; the egress leaf decrements again — symmetric: two routing hops.' }),
        L('Internet Control Message Protocol', [f('Type', o.reply ? '0 (Echo (ping) reply)' : '8 (Echo (ping) request)'), f('Code', '0')])];
      return out(tx, spine, { src: DEV[srcV].lo1, dst: DEV[dstV].lo1, proto: 'VXLAN', len, key: !!o.key, tag: 'vxlan',
        vx: { vni: 50001, osrc: DEV[srcV].lo1, odst: DEV[dstV].lo1, isrc: rmac(srcV), idst: rmac(dstV), inner: `ICMP ${o.sip} → ${o.dip}` },
        info: `VNI 50001 │ ${o.reply ? 'Echo (ping) reply  ' : 'Echo (ping) request'}  ${o.sip} → ${o.dip}  ttl=${o.ttl}`, keyField: 'VXLAN Network Identifier (VNI)',
        layers: vxl(tx, spine, sm, dm, len, DEV[srcV].lo1, DEV[dstV].lo1, sp, 50001, 'unicast', ...inner) });
    }
  };

  function garpBody() { return L('Address Resolution Protocol (request/gratuitous ARP)', [f('Sender MAC address', DEV.host.mac), f('Sender IP address', '10.1.10.10'), f('Target IP address', '10.1.10.10')]); }
  function vxl(a, spine, sm, dm, len, osrc, odst, sp, vni, mode, ...inner) {
    const ipLen = len - 14;
    return [FRAME(len, a, spine), ETH(sm, dm, mode === 'mcast' ? null : null, mode === 'mcast' ? { hl: true, note: 'Outer dst MAC = multicast MAC mapped from 239.1.1.10 (01:00:5e + low 23 bits).' } : null),
      IP(osrc, odst, 'UDP (17)', 64, ipLen, mode === 'mcast' ? { ttl: 'Outer destination is the multicast group — the underlay (PIM) replicates it along the tree.' } : null),
      L(`User Datagram Protocol, Src Port: ${sp}, Dst Port: 4789`, [f('Source Port', String(sp), { note: 'Hash of the INNER frame headers → entropy for underlay ECMP.' }), f('Destination Port', '4789', { hl: true, note: 'IANA-assigned VXLAN port.' }), f('Length', String(ipLen - 20))]),
      L('Virtual eXtensible Local Area Network', [f('Flags', '0x0800, VXLAN Network ID (VNI)', { note: 'I-flag set: the VNI field is valid.' }), f('Group Policy ID', '0'),
        f('VXLAN Network Identifier (VNI)', String(vni), { hl: true, note: vni === 50001 ? 'The L3VNI of VRF Tenant-A: routed traffic uses it in BOTH directions (symmetric IRB).' : 'The L2VNI mapped to VLAN 10. 24 bits → 16 million segments vs 4094 VLANs.' }), f('Reserved', '0')])].concat(inner);
  }
  P_.GWM = GWM; P_.mcMac = mcMac;
  return P_;
})();
