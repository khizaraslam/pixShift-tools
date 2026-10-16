// Minimal EXIF reader for JPEG files. Runs in the browser; nothing is uploaded.

export interface Exif {
  make?: string;
  model?: string;
  software?: string;
  taken?: string;
  lens?: string;
  exposure?: string;
  fnumber?: string;
  iso?: number;
  focal?: string;
  lat?: number;
  lon?: number;
  alt?: number;
}

interface Entry {
  type: number;
  count: number;
  at: number;
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

export function parseExif(buf: ArrayBuffer): Exif | null {
  try {
    const v = new DataView(buf);
    if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return null;
    let p = 2;
    while (p + 4 <= v.byteLength) {
      if (v.getUint8(p) !== 0xff) break;
      const marker = v.getUint8(p + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const len = v.getUint16(p + 2);
      // APP1 segment that starts with "Exif\0\0"
      if (marker === 0xe1 && p + 10 <= v.byteLength && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) {
        return readTiff(v, p + 10);
      }
      p += 2 + len;
    }
  } catch {
    /* damaged or unusual file: treat as no data */
  }
  return null;
}

function readTiff(v: DataView, t: number): Exif | null {
  const little = v.getUint16(t) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, little);
  const u32 = (o: number) => v.getUint32(o, little);

  const ifd = (rel: number) => {
    const m = new Map<number, Entry>();
    const o = t + rel;
    if (o + 2 > v.byteLength) return m;
    const n = u16(o);
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      m.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8 });
    }
    return m;
  };

  const dataAt = (en: Entry) => {
    const size = (TYPE_SIZE[en.type] ?? 1) * en.count;
    return size <= 4 ? en.at : t + u32(en.at);
  };

  const str = (en?: Entry) => {
    if (!en) return undefined;
    const o = dataAt(en);
    if (en.count > 512 || o + en.count > v.byteLength) return undefined;
    let s = "";
    for (let i = 0; i < en.count; i++) {
      const c = v.getUint8(o + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim() || undefined;
  };

  const nums = (en?: Entry): number[] => {
    if (!en) return [];
    const o = dataAt(en);
    const size = (TYPE_SIZE[en.type] ?? 1) * Math.min(en.count, 8);
    if (o + size > v.byteLength) return [];
    const out: number[] = [];
    for (let i = 0; i < Math.min(en.count, 8); i++) {
      switch (en.type) {
        case 1:
          out.push(v.getUint8(o + i));
          break;
        case 3:
          out.push(u16(o + i * 2));
          break;
        case 4:
          out.push(u32(o + i * 4));
          break;
        case 9:
          out.push(v.getInt32(o + i * 4, little));
          break;
        case 5: {
          const d = u32(o + i * 8 + 4);
          out.push(d ? u32(o + i * 8) / d : 0);
          break;
        }
        case 10: {
          const d = v.getInt32(o + i * 8 + 4, little);
          out.push(d ? v.getInt32(o + i * 8, little) / d : 0);
          break;
        }
        default:
          return out;
      }
    }
    return out;
  };

  const i0 = ifd(u32(t + 4));
  const out: Exif = {
    make: str(i0.get(0x010f)),
    model: str(i0.get(0x0110)),
    software: str(i0.get(0x0131)),
  };

  const exifPtr = nums(i0.get(0x8769))[0];
  if (exifPtr) {
    const e = ifd(exifPtr);
    out.taken = str(e.get(0x9003)) ?? str(e.get(0x9004));
    out.lens = str(e.get(0xa434));
    const ex = nums(e.get(0x829a))[0];
    if (ex) out.exposure = ex < 1 ? `1/${Math.round(1 / ex)} s` : `${+ex.toFixed(1)} s`;
    const f = nums(e.get(0x829d))[0];
    if (f) out.fnumber = `f/${f.toFixed(1)}`;
    const iso = nums(e.get(0x8827))[0];
    if (iso) out.iso = iso;
    const fl = nums(e.get(0x920a))[0];
    if (fl) out.focal = `${Math.round(fl)} mm`;
  }
  if (!out.taken) out.taken = str(i0.get(0x0132));

  const gpsPtr = nums(i0.get(0x8825))[0];
  if (gpsPtr) {
    const g = ifd(gpsPtr);
    const dms = (a: number[]) => (a.length >= 3 ? a[0] + a[1] / 60 + a[2] / 3600 : undefined);
    let lat = dms(nums(g.get(2)));
    let lon = dms(nums(g.get(4)));
    if (lat !== undefined && lon !== undefined && !(lat === 0 && lon === 0)) {
      if ((str(g.get(1)) ?? "N").toUpperCase().startsWith("S")) lat = -lat;
      if ((str(g.get(3)) ?? "E").toUpperCase().startsWith("W")) lon = -lon;
      out.lat = lat;
      out.lon = lon;
      const alt = nums(g.get(6))[0];
      if (alt !== undefined) out.alt = nums(g.get(5))[0] === 1 ? -alt : alt;
    }
  }

  const any = Object.values(out).some((x) => x !== undefined);
  return any ? out : null;
}

export function formatTaken(s?: string) {
  if (!s) return undefined;
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return s;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = Number(m[2]) - 1;
  if (mi < 0 || mi > 11) return s;
  return `${Number(m[3])} ${months[mi]} ${m[1]}, ${m[4]}:${m[5]}`;
}

export function formatCoords(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(5)}° ${lon >= 0 ? "E" : "W"}`;
}