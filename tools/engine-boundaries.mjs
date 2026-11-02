// Standalone source and deployment boundaries. No recovery snapshot is needed.
import fs from 'node:fs';
import path from 'node:path';
import { parseExpressionAt } from 'acorn';
import { parseSync } from 'vite';

const CODE = /\.(?:[cm]?js|jsx|ts|tsx)$/i;
const TEXT = /\.(?:[cm]?js|jsx|ts|tsx|css|html?|svg|json|webmanifest)$/i;

// Exact keys of unreferenced original-service prose; product/gameplay branding is allowed.
export const REMOVED_LEGACY_TRANSLATION_KEYS = Object.freeze([
  "10jjcuniwr7",
  "1100fy3dum5",
  "117m15zr6p4",
  "11lht1x0q4u",
  "11rif4deprs",
  "120v9odinni",
  "12ijmi5j8ge",
  "12wkbzwd5xu",
  "12xpl51qoby",
  "132iis8rn5y",
  "137817egt4c",
  "13jahc87c03",
  "13zpob51u9q",
  "1425tdvbf0h",
  "143yprj661s",
  "14fxqlzoo1e",
  "14ghnfy4vox",
  "14jgbz6q3x3",
  "14m1vbg5eaf",
  "14u5fssjjmh",
  "15ei5mo105p",
  "15i8wtk6gyj",
  "16gmmglmlfw",
  "16v9k0fd4ya",
  "184mm6gtxb2",
  "18fjflnty16",
  "18qy424hpbf",
  "196apl702te",
  "19pa113hild",
  "1a5dj1wsyqi",
  "1ajstfjvlyg",
  "1be95dnhjjr",
  "1bfjrx62gm0",
  "1bp26lotg0o",
  "1d5853h39bn",
  "1dkqbxpch5",
  "1dnry13v1yj",
  "1eez6ko7nqo",
  "1fcmqm4j3eq",
  "1fpnnn3ogca",
  "1g9cgbtl7zc",
  "1gj0y23xlda",
  "1gv1nm0jkdn",
  "1hbasgc844h",
  "1hzbf9m4vdy",
  "1i4tn3lardt",
  "1i5vqok4pyi",
  "1igpygbwtbd",
  "1im2krzpzx9",
  "1ir5f26lmcd",
  "1iysllwmk",
  "1joie43ehsy",
  "1ka52n130tr",
  "1ka7vsg34k8",
  "1kkh18w4mg8",
  "1kwvn639ozx",
  "1lx94dkoeyw",
  "1lzr8yhl5k",
  "1n8445wr05m",
  "1nuqpk34vyi",
  "1nzff8tqitk",
  "1ova97p7y75",
  "1pcr4b25ffx",
  "1q1w469nyux",
  "1q5z9rd9rn2",
  "1q8p1bfxvio",
  "1qv4ogn882",
  "1qyw8kp6pyw",
  "1r6loqbr11k",
  "1rwq6wh3544",
  "1s5qddpx6gu",
  "1s9umylp13h",
  "1sw4o9hcqg0",
  "1sxxndm7a3c",
  "1t5i4lns6e4",
  "1tsvjsz9ys2",
  "1tyl3qgg4sl",
  "1tz15yyhcxo",
  "1u6bkypnkar",
  "1u6s59y3j9q",
  "1ullg0sduzi",
  "1unybg9ayo6",
  "1up325cuolx",
  "1uuvmhaqxyn",
  "1v8eqhz2eqo",
  "1v8lxc1wuee",
  "1vc0w7zhf5d",
  "1viml5rlwf",
  "1vtc6uqdwci",
  "1waz38oft8j",
  "1wm39z4fb4v",
  "1wqqtjx9aq2",
  "1wvz02xzqgd",
  "1wya5rdaxwz",
  "1x5vbuwwtzc",
  "1xpxnagedov",
  "1xv8aioq1ft",
  "1xy5me7fdr9",
  "1yd6m168alq",
  "1yoov1ij0d7",
  "1yqsuh064rx",
  "1zsfib5z6lb",
  "1zzuq7krd6v",
  "20d13dftekz",
  "218ca8rgak3",
  "21keh49pck8",
  "2235kjkm9w7",
  "226ah9vhp2i",
  "22dvembccl0",
  "23lekei8kn1",
  "23s463wyq89",
  "248m3j9sw5h",
  "24jrlzdd8rq",
  "24pmf6ylysd",
  "266tcrqr15",
  "26d6bv2hnre",
  "26oka4wmc9v",
  "26ws6m44k1i",
  "27o7jsxt4rv",
  "27v99y71icp",
  "28oz3mm1njz",
  "29nqrem8nl8",
  "2ab9t4hdxq4",
  "2awoedaq8p2",
  "2ba4ds35980",
  "2bb72lgqqu6",
  "2bdvsyi7rug",
  "2c55pxs1nxe",
  "2cztri5cwqn",
  "2d3juj5edl8",
  "2d7x4fbzyn8",
  "2djh6x9qbqy",
  "2e63abf06ts",
  "2eh2gao8ky8",
  "2enj1jg3s6q",
  "2f5vko6qila",
  "2f93ru9vw29",
  "2fpjx1rh1us",
  "2fqfcburd0",
  "2fx80ql2mz6",
  "2gneoo8ks5",
  "30em1uuidc",
  "3692v9an72",
  "3hlind9j6e",
  "3w001wedeg",
  "4b0ors8plc",
  "5ed3c88fns",
  "5fxxme18tz",
  "5mr4naw3hy",
  "5urwx39d45",
  "5zikyj1gb7",
  "6mh0wmb8oj",
  "6pyt3oarxc",
  "7b4unkxwc4",
  "7efefx8ltb",
  "7hkqcicf79",
  "7t49pky4f2",
  "7vmzuub5x2",
  "89irrro276",
  "8r2n58p6ea",
  "8ra28abibq",
  "8sqy1dg4j6",
  "967mhm4oi",
  "9yuvjlp0ax",
  "afj44bjqth",
  "agojwjqqp4",
  "b037bj1l4r",
  "baaoxvh1l8",
  "bob34bafbi",
  "btqoupq0qs",
  "bukee5fvbj",
  "c4wncxz4gz",
  "ccbybxr7vx",
  "cmf3hhpacz",
  "cz6lfai5cy",
  "eeuh63jl2y",
  "enblmoovlf",
  "ez96xbsr4j",
  "fw643q0v7u",
  "fxhvwzpqwn",
  "g8h5zwc84g",
  "gwcqno3fy1",
  "h2dqkdaxpy",
  "hdcleaunav",
  "hjnn9r86xd",
  "hl2h74ggr7",
  "hrmxvhde40",
  "hvg5nghpky",
  "hxdtwizenx",
  "ibyowhfkor",
  "iyjn4s39ud",
  "j0v05y3ofy",
  "kbcpcuyvo8",
  "kk43pj96b",
  "kmpf8qovon",
  "kra8apa39i",
  "lg33vcyxgg",
  "lh3pk7s82x",
  "m1p0xz28rf",
  "n4qruzbuqp",
  "nenkrk6tm5",
  "o3w4vklgdv",
  "o5680rex8n",
  "o7u9x681cq",
  "oslho5k554",
  "pdzbaooemt",
  "pk8dfzj1ce",
  "ps520wp1ar",
  "qifrw8hcm6",
  "qmp90pv2xe",
  "qqll0ubpgl",
  "s5ef5myjon",
  "sezdthizcb",
  "sit0hqie3e",
  "smti21asd1",
  "swr8s8285w",
  "tuz0c3tawk",
  "ubywslbo0o",
  "ufvsoz5uqf",
  "upt8pa6efn",
  "v660a4z8fn",
  "v9aozszq45",
  "vf6wiwjmhx",
  "vrs99llyxh",
  "vtmtrcwwfw",
  "w2dxgc3ofi",
  "w6pvuu7cj1",
  "wsyi1tce3q",
  "y8sgjxbte3",
  "ycttp3g7m5",
  "yvbavpsztx",
  "z3mde2fmov",
  "zd5lq1ic3v"
]);
const legacyTranslationKeys = new Set(REMOVED_LEGACY_TRANSLATION_KEYS);
const legacyKeyToken = new RegExp("\\b(?:" + REMOVED_LEGACY_TRANSLATION_KEYS.join("|") + ")\\b");

const slash = value => value.split(path.sep).join('/');
const inside = (root, file) => file.startsWith(root + path.sep);

function walk(directory, visit) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Linked runtime file is not allowed: ${file}`);
    if (entry.isDirectory()) walk(file, visit);
    else if (entry.isFile()) visit(file);
  }
}

function forbiddenPath(name) {
  return /(?:^|\/)(?:reference|raw|generated|recovery-life(?:-[^/]+)?)(?:\/|$)/i.test(name)
    || /(?:^|\/)(?:keepx|labw)(?:[.\w-]*)\.js(?:[?#]|$)/i.test(name)
    || /(?:^|\/)a\/[a-z-]+\.[a-f0-9]{8,}\.js(?:[?#]|$)/i.test(name);
}

function legacyDictionaryFailures(name, text) {
  if (!CODE.test(name) || !legacyKeyToken.test(text)) return [];
  const parsed = parseSync(name, text), found = new Set();
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property') {
      const key = node.key?.type === 'Literal' ? node.key.value : !node.computed ? node.key?.name : null;
      if (legacyTranslationKeys.has(key)) found.add(key);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(parsed.program);
  return found.size ? [`Legacy service translation keys in runtime: ${name} → ${[...found].sort().join(', ')}`] : [];
}

function legacyTextFailures(name, text) {
  const failures = [];
  if (/\b1in8b\.life\b/i.test(text)) failures.push(`Original domain in runtime: ${name}`);
  if (/\/api\//i.test(text)) failures.push(`Old API path in runtime: ${name}`);
  if (/\b(?:keepx|labw)(?:[.\w-]*)\.js\b|cloud\.umami\.is/i.test(text)) failures.push(`Old script or analytics in runtime: ${name}`);
  if (CODE.test(name) && /\b(?:deadstack|cardShareBtn|cardSaveBtn|a2Dead)\b/.test(text)) failures.push(`Unused original death/share UI in runtime: ${name}`);
  if (CODE.test(name) && /(?:https?:)?\/\/[^\s"'<>`]+\.m?js(?:[?#/\s"'<>`]|$)|\.src\s*=\s*['"](?:https?:)?\/\//i.test(text)) failures.push(`Remote script/resource loader in runtime: ${name}`);
  failures.push(...legacyDictionaryFailures(name, text));
  return failures;
}

// Vite's parser supplies module requests for JS, TypeScript and JSX without
// treating examples in comments or ordinary text as executable imports.
function moduleRequests(name, text, failures) {
  const parsed = parseSync(name, text);
  if (parsed.errors.length) {
    failures.push(`Cannot parse runtime module ${name}: ${parsed.errors[0].message}`);
    return [];
  }
  const requests = parsed.module.staticImports.map(item => item.moduleRequest.value);
  for (const item of parsed.module.staticExports) {
    for (const entry of item.entries) if (entry.moduleRequest) requests.push(entry.moduleRequest.value);
  }
  for (const item of parsed.module.dynamicImports) {
    const request = text.slice(item.moduleRequest.start, item.moduleRequest.end);
    try {
      const expression = parseExpressionAt(request, 0, { ecmaVersion: 'latest' });
      const value = expression.type === 'Literal' ? expression.value
        : expression.type === 'TemplateLiteral' && expression.expressions.length === 0 ? expression.quasis[0].value.cooked : null;
      if (typeof value !== 'string' || expression.end !== request.length) throw new Error('not a static string');
      requests.push(value);
    } catch {
      failures.push(`Dynamic import must name a local module explicitly: ${name} → ${request.slice(0, 100)}`);
    }
  }
  for (const item of parsed.module.importMetas) {
    const tail = text.slice(item.end);
    const glob = /^\s*\.glob(?:<[\s\S]*?>)?\s*\(\s*(['"])([^'"]+)\1/.exec(tail);
    if (glob) requests.push(glob[2]);
  }
  return [...new Set(requests)];
}

function resolveFile(base) {
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'].map(ext => base + ext),
    ...['index.ts', 'index.tsx', 'index.js', 'index.jsx'].map(name => path.join(base, name))]
    .find(file => fs.existsSync(file) && fs.statSync(file).isFile());
}

function checkModuleRequest(root, file, request, failures, { distribution = false, dependencies = {} } = {}) {
  const name = slash(path.relative(root, file));
  if (forbiddenPath(request.replaceAll('\\', '/'))) failures.push(`Legacy module dependency: ${name} → ${request}`);
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(request)) {
    failures.push(`Remote/non-browser module dependency: ${name} → ${request}`);
    return;
  }
  if (!request.startsWith('.') && !request.startsWith('/')) {
    const dependency = request.startsWith('@') ? request.split('/').slice(0, 2).join('/') : request.split('/')[0];
    if (distribution || !Object.hasOwn(dependencies, dependency)) failures.push(`Undeclared module dependency: ${name} → ${request}`);
    return;
  }
  const clean = request.split(/[?#]/, 1)[0];
  const base = path.resolve(request.startsWith('/') ? root : path.dirname(file), clean.replace(/^\/+/, ''));
  if (!inside(root, base)) {
    failures.push(`Module leaves the standalone project: ${name} → ${request}`);
    return;
  }
  if (/[*{[]/.test(base)) {
    const prefix = base.slice(0, base.search(/[*{[]/));
    const directory = prefix.endsWith(path.sep) ? prefix.slice(0, -1) : path.dirname(prefix);
    if (!fs.existsSync(directory)) failures.push(`Missing local import glob directory: ${name} → ${request}`);
    return;
  }
  const target = resolveFile(base);
  if (!target) failures.push(`Missing local module: ${name} → ${request}`);
  if (!distribution && name.startsWith('src/') && !inside(path.join(root, 'src'), target ?? base) && !inside(path.join(root, 'public'), target ?? base)) {
    failures.push(`Module leaves the runtime source roots: ${name} → ${request}`);
  }
  if (!distribution && /^(?:src\/(?:app|screens|ui|flow|components))\//.test(name)
    && /^(?:src\/(?:core|engine))\//.test(slash(path.relative(root, target ?? base)))) {
    failures.push(`UI bypasses the adapter: ${name} → ${request}`);
  }
}

function resourceUrls(name, text) {
  const urls = [];
  if (/\.html?$/i.test(name)) {
    for (const tag of text.matchAll(/<(?:script|link|img|source|iframe|video|audio|track|object|embed)\b[^>]*>/gi)) {
      for (const attr of tag[0].matchAll(/\s(?:src|href|poster|data)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) urls.push(attr[1] ?? attr[2] ?? attr[3]);
    }
  } else if (/\.css$/i.test(name)) {
    for (const match of text.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) urls.push(match[1] ?? match[2] ?? match[3]);
    for (const match of text.matchAll(/@import\s+["']([^"']+)["']/gi)) urls.push(match[1]);
  } else if (/\.webmanifest$/i.test(name)) {
    const manifest = JSON.parse(text);
    for (const item of [...manifest.icons ?? [], ...manifest.screenshots ?? []]) if (item.src) urls.push(item.src);
  }
  return urls;
}

function checkResource(root, file, raw, failures, { publicDir = null } = {}) {
  const name = slash(path.relative(root, file));
  const url = raw.trim().replaceAll('&amp;', '&');
  if (!url || url.startsWith('#') || /^data:/i.test(url)) return;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) {
    failures.push(`Runtime asset must be local: ${name} → ${url}`);
    return;
  }
  let relative;
  try { relative = decodeURIComponent(url.split(/[?#]/, 1)[0]); }
  catch { failures.push(`Invalid asset URL: ${name} → ${url}`); return; }
  const candidate = path.resolve(relative.startsWith('/') ? root : path.dirname(file), relative.replace(/^\/+/, ''));
  const targets = [candidate];
  if (publicDir) targets.push(path.resolve(publicDir, relative.replace(/^\/+/, '')));
  if (!targets.some(target => inside(root, target) && fs.existsSync(target) && fs.statSync(target).isFile())) {
    failures.push(`Missing asset or path outside project: ${name} → ${url}`);
  }
}

/** Source verification is self-contained: source files and declared npm packages only. */
export function verifySourceBoundaries(directory) {
  const root = path.resolve(directory);
  const failures = [];
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const lang of ['en', 'ru', 'es', 'fr', 'de']) {
    if (!fs.existsSync(path.join(root, 'src/engine', `game.${lang}.js`))) failures.push(`Missing owned engine source: game.${lang}.js`);
  }
  for (const name of ['era.js', 'state-effects.js']) if (!fs.existsSync(path.join(root, 'src/engine', name))) failures.push(`Missing owned engine source: ${name}`);
  const inspect = file => {
    const name = slash(path.relative(root, file));
    if (forbiddenPath(name)) failures.push(`Legacy runtime file: ${name}`);
    if (!TEXT.test(name)) return; // Legal notices and historical Markdown remain intact.
    const text = fs.readFileSync(file, 'utf8');
    failures.push(...legacyTextFailures(name, text));
    if (CODE.test(name)) {
      for (const request of moduleRequests(name, text, failures)) checkModuleRequest(root, file, request, failures, {
        dependencies: name === 'vite.config.ts' ? { ...pkg.dependencies, ...pkg.devDependencies } : pkg.dependencies,
      });
    }
    for (const url of resourceUrls(name, text)) checkResource(root, file, url, failures, { publicDir: path.join(root, 'public') });
  };
  for (const name of ['src', 'public']) {
    const directory = path.join(root, name);
    if (fs.existsSync(directory)) walk(directory, inspect);
    else failures.push(`Missing runtime directory: ${name}`);
  }
  for (const name of ['index.html', 'vite.config.ts']) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) inspect(file);
    else failures.push(`Missing runtime entry: ${name}`);
  }
  return failures;
}

/** Every deployable engine chunk is checked too; no generated-code exception exists. */
export function verifyDistributionBoundaries(directory) {
  const root = path.resolve(directory);
  const failures = [];
  if (!fs.existsSync(path.join(root, 'index.html'))) return ['Missing dist/index.html; run npm run build first'];
  walk(root, file => {
    const name = slash(path.relative(root, file));
    if (forbiddenPath(name) || /(?:^|\/)(?:(?:game|lab)\.[a-z]{2,3}(?:-[a-z]{2})?|era|keepsakes)\.js$/i.test(name)) failures.push(`Legacy file in distribution: ${name}`);
    if (!TEXT.test(name)) return;
    const text = fs.readFileSync(file, 'utf8');
    failures.push(...legacyTextFailures(name, text));
    if (CODE.test(name)) for (const request of moduleRequests(name, text, failures)) checkModuleRequest(root, file, request, failures, { distribution: true });
    for (const url of resourceUrls(name, text)) checkResource(root, file, url, failures);
  });
  return failures;
}
