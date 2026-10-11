/* Static fabric definition: devices, slots on the canvas, links, addressing. */
const DEV = {
  spine1: { id: 'spine1', name: 'Spine-1', kind: 'spine', role: 'Spine · EVPN route server', asn: 65000, lo0: '10.0.0.1', n: 1, idx: 1 },
  spine2: { id: 'spine2', name: 'Spine-2', kind: 'spine', role: 'Spine · EVPN route server', asn: 65000, lo0: '10.0.0.2', n: 2, idx: 2 },
  leaf1:  { id: 'leaf1',  name: 'Leaf-1',  kind: 'leaf',  role: 'Leaf · VTEP · ES member', asn: 65000, lo0: '10.0.0.11', lo1: '10.1.1.1', n: 1, idx: 11 },
  leaf2:  { id: 'leaf2',  name: 'Leaf-2',  kind: 'leaf',  role: 'Leaf · VTEP · ES member', asn: 65000, lo0: '10.0.0.12', lo1: '10.1.1.2', n: 2, idx: 12 },
  border: { id: 'border', name: 'Border-Leaf', kind: 'border', role: 'Border leaf · VTEP', asn: 65000, lo0: '10.0.0.13', lo1: '10.1.1.3', n: 3, idx: 13 },
  host:   { id: 'host',   name: 'Host-A',  kind: 'host',  role: 'Server · dual-homed (LACP)', ip: '10.1.10.10', mac: '00:50:56:aa:10:10', idx: 21 },
  wan:    { id: 'wan',    name: 'WAN-Router', kind: 'wan', role: 'External router · AS 65100', asn: 65100, idx: 31 }
};

const SLOTS = {
  spine1: { x: 230, y: 62,  kind: 'spine' },
  spine2: { x: 530, y: 62,  kind: 'spine' },
  leaf1:  { x: 110, y: 222, kind: 'leaf' },
  leaf2:  { x: 350, y: 222, kind: 'leaf' },
  border: { x: 650, y: 222, kind: 'border' },
  host:   { x: 230, y: 372, kind: 'host' },
  wan:    { x: 650, y: 372, kind: 'wan' }
};

const PALETTE = [
  { kind: 'spine',  label: 'Spine',        count: 2 },
  { kind: 'leaf',   label: 'Leaf',         count: 2 },
  { kind: 'border', label: 'Border Leaf',  count: 1 },
  { kind: 'host',   label: 'Host',         count: 1 },
  { kind: 'wan',    label: 'WAN Router',   count: 1 }
];

const KIND_COLOR = {
  spine:  { fill: '#e8f0fe', stroke: '#3b6fd4' },
  leaf:   { fill: '#e6f4ea', stroke: '#2e8b57' },
  border: { fill: '#fff4e0', stroke: '#e08a00' },
  host:   { fill: '#f1f3f4', stroke: '#6b7280' },
  wan:    { fill: '#f3e8fd', stroke: '#8a4fd0' }
};

const SP = ['spine1', 'spine2'];
const LF = ['leaf1', 'leaf2', 'border'];
const UPL = {};                      // leaf -> uplinks
const DOWN = { spine1: [], spine2: [] }; // spine -> downlinks
const LINKS = [];

LF.forEach(l => {
  UPL[l] = [];
  SP.forEach(s => {
    const net = `10.2.${DEV[l].n}${DEV[s].n}`;
    UPL[l].push({ ifc: `Ethernet1/${DEV[s].n}`, ip: `${net}.1`, peer: `${net}.0`, spine: s });
    DOWN[s].push({ ifc: `Ethernet1/${DEV[l].n}`, ip: `${net}.0`, peer: `${net}.1`, leaf: l });
    LINKS.push({ a: l, b: s, pa: `Eth1/${DEV[s].n}`, pb: `Eth1/${DEV[l].n}`, net: `${net}.0/31` });
  });
});
LINKS.push({ a: 'host', b: 'leaf1', pa: 'eth0', pb: 'Eth1/10' });
LINKS.push({ a: 'host', b: 'leaf2', pa: 'eth1', pb: 'Eth1/10' });
LINKS.push({ a: 'border', b: 'wan', pa: 'Eth1/20', pb: 'Eth0' });

const ekey = (a, b) => [a, b].sort().join('|');
function findLink(a, b) { return LINKS.find(l => ekey(l.a, l.b) === ekey(a, b)); }
function portOf(dev, other) {
  const l = findLink(dev, other);
  return l ? (l.a === dev ? l.pa : l.pb) : '?';
}

/* Lab-wide settings and constants */
const CFG = { bum: 'ir' };                 // 'ir' = ingress replication, 'mc' = multicast (PIM anycast RP)
const MC = () => CFG.bum === 'mc';
const RP_IP = '10.254.254.1', MCG = '239.1.1.10', MCG_MAC = '01:00:5e:01:01:0a';
const ANYCAST_GW_MAC = '0000.2222.3333', GW_IP = '10.1.10.1';
const hx = n => n.toString(16).padStart(2, '0');
const rmac = d => `00:3a:7d:${hx(DEV[d].idx)}:00:00`;           // router MAC (L3VNI)
const rmacDot = d => `003a.7d${hx(DEV[d].idx)}.0000`;
const EXT = { border: '192.0.2.0', wan: '192.0.2.1' };           // border<->WAN /31
