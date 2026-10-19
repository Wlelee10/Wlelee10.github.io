'use strict';


/* ==========================================================
   Click is the main interaction. Darker speech bubbles need more
   clicks, and each click reduces their size and colour intensity.
   The figure responds to the remaining weight.
   ========================================================== */


/* AI use:
   I used ChatGPT during development to help with coding, debugging and
   understanding some JavaScript and SVG techniques. I tested and adjusted
   the generated suggestions to fit the interaction and visual direction
   of this project.

   The project concept, design decisions and final implementation choices
   were made by me.
*/


/* SVG DOM
   I create the bubbles and figure as SVG elements in JavaScript because they
   need to change shape, colour and position while the interaction is running.

   I used the Class 6 DOM material as a guide for creating and updating page
   elements with JavaScript, then applied the same idea to SVG using
   createElementNS() and setAttribute().

   Course: Class 6 — DOM handling with Javascript
   https://rmit.instructure.com/courses/163616/modules/items/8496416

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS
   https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
*/

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (parent) parent.appendChild(node);
  return node;
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);

const follow = (rate, dt) => 1 - Math.exp(-rate * dt);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

const COLOR_STOPS = [
  [255, 205, 186],
  [255, 122, 92],
  [255, 58, 20],
  [206, 18, 34],
  [122, 6, 58],
];

const PALE = '#ffd9cc';

function wordRGB(darkness) {
  const d = clamp(darkness, 0, 1);
  const seg = d * (COLOR_STOPS.length - 1);
  const i = Math.min(Math.floor(seg), COLOR_STOPS.length - 2);
  const t = seg - i;
  const a = COLOR_STOPS[i];
  const b = COLOR_STOPS[i + 1];

  return [0, 1, 2].map((c) => lerp(a[c], b[c], t));
}

const mixRGB = (a, b, t) => a.map((v, c) => lerp(v, b[c], t));

const css = (c) =>
  `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;

const wordColor = (darkness) => css(wordRGB(darkness));

let bubbleCount = 0;


/* SVG speech bubbles
   Each bubble is built from SVG shapes, gradients, masks and text instead of
   being a fixed image. This lets the same bubble shrink, lighten and keep its
   texture after every click.

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/radialGradient
   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/mask
*/

function makeBubble(parent, extraClass, phrases, darkness = 0.5) {
  const id = `bubbleTone${bubbleCount++}`;

  const g = svgEl(
    'g',
    {
      class: 'bubble ' + (extraClass || ''),
    },
    parent
  );

  const defs = svgEl('defs', {}, g);

  const grad = svgEl(
    'radialGradient',
    {
      id,
      cx: 0.5,
      cy: 0.5,
      r: 0.5,
      fx: 0.42,
      fy: 0.58,
    },
    defs
  );

  const stops = [0, 0.45, 0.8, 1].map((o) =>
    svgEl(
      'stop',
      {
        offset: o,
      },
      grad
    )
  );

  // Each bubble gets its own copy of the grain filter so the filter region can
  // follow the circle. The default region is based on the bounding box, which
  // also includes the long hidden text lines and is several times wider.
  const grain = document.getElementById('bubbleGrain').cloneNode(true);
  grain.id = `${id}Grain`;
  grain.setAttribute('filterUnits', 'userSpaceOnUse');
  defs.appendChild(grain);

  const skin = svgEl(
    'g',
    {
      filter: `url(#${grain.id})`,
    },
    g
  );

  const tail = svgEl('path', {}, skin);

  const body = svgEl(
    'circle',
    {
      fill: `url(#${id})`,
    },
    skin
  );

  const fadeId = `${id}Fade`;

  const fade = svgEl(
    'radialGradient',
    {
      id: `${fadeId}G`,
      gradientUnits: 'userSpaceOnUse',
      cx: -14,
      cy: 14,
      r: 100,
    },
    defs
  );

  [
    [0, 1],
    [0.35, 0.95],
    [0.7, 0.4],
    [1, 0],
  ].forEach(([o, a]) =>
    svgEl(
      'stop',
      {
        offset: o,
        'stop-color': '#fff',
        'stop-opacity': a,
      },
      fade
    )
  );

  const mask = svgEl(
    'mask',
    {
      id: fadeId,
      maskUnits: 'userSpaceOnUse',
      x: -100,
      y: -100,
      width: 200,
      height: 200,
    },
    defs
  );

  svgEl(
    'circle',
    {
      cx: 0,
      cy: 0,
      r: 100,
      fill: `url(#${fadeId}G)`,
    },
    mask
  );

  const pile = svgEl(
    'g',
    {
      class: 'word-pile',
      mask: `url(#${fadeId})`,
    },
    skin
  );

  const scraps = [];
  const heavy = clamp((darkness - 0.45) / 0.55, 0, 1);
  const lines = Math.round(lerp(14, 70, heavy)) + Math.floor(Math.random() * 6);
  const reach = lerp(24, 34, heavy);

  for (let k = 0; k < lines; k++) {
    const cx0 = (rand(-1, 1) + rand(-1, 1) + rand(-1, 1)) * reach - 8;
    const cy0 = (rand(-1, 1) + rand(-1, 1) + rand(-1, 1)) * reach + 6;
    const size = rand(11, 19);

    const t = svgEl(
      'text',
      {
        x: 0,
        y: 0,
        'text-anchor': 'middle',
        'font-size': size.toFixed(1),
        transform: `translate(${cx0.toFixed(1)} ${cy0.toFixed(1)}) rotate(${rand(-14, 14).toFixed(1)})`,
      },
      pile
    );

    t.textContent = pickPhrases(
      phrases,
      1 + Math.floor(Math.random() * (1.5 + heavy * 2))
    );

    scraps.push(t);
  }

  const shade = svgEl('g', {}, burdenShadow);
  const shadeTail = svgEl('path', {}, shade);
  const shadeBody = svgEl('circle', {}, shade);

  return {
    g,
    tail,
    body,
    stops,
    pile,
    scraps,
    grain,
    shade,
    shadeTail,
    shadeBody,
  };
}


/* The text is grouped from suspicion through to exclusion. The darkest
   bubbles use harsher phrases, so colour, density and language all point to
   the same idea of increasing weight. */

const SAYINGS = [
  [
    "Did you hear?",
    "Something's off.",
    "That's suspicious.",
    "I don't trust her.",
    "She's hiding something.",
    "Seems fake.",
    "Is that true?",
    "I heard something.",
  ],

  [
    "She's so fake.",
    "Nobody likes her.",
    "She's a liar.",
    "She's desperate.",
    "Such an attention seeker.",
    "She's two-faced.",
    "She's pretending.",
    "Everyone knows.",
  ],

  [
    "I heard she cheated.",
    "She talks behind your back.",
    "She's using him.",
    "She stole it.",
    "She betrayed her friend.",
    "She lied about everything.",
    "She's not innocent.",
    "You know what she did?",
  ],

  [
    "What a loser.",
    "So embarrassing.",
    "She's pathetic.",
    "She's toxic.",
    "She's a joke.",
    "Can't stand her.",
    "Don't believe her.",
    "Stay away from her.",
  ],

  [
    "Nobody wants her here.",
    "Don't talk to her.",
    "Everyone hates her.",
    "She deserves it.",
    "She's the problem.",
    "We don't need her.",
    "She's not one of us.",
    "It's all her fault.",
  ],
];

function pickPhrases(phrases, n) {
  const out = [];

  for (let i = 0; i < n; i++) {
    out.push(phrases[Math.floor(Math.random() * phrases.length)]);
  }

  return out.join(' ');
}

function drawBubble(b, cx, cy, r, fill, tailAngle) {
  const radius = Math.max(0, r);
  const len = radius * 0.22;
  b.body.setAttribute('cx', cx.toFixed(1));
  b.body.setAttribute('cy', cy.toFixed(1));
  b.body.setAttribute('r', radius.toFixed(1));
  b.shadeBody.setAttribute('cx', cx.toFixed(1));
  b.shadeBody.setAttribute('cy', cy.toFixed(1));
  b.shadeBody.setAttribute('r', radius.toFixed(1));

  // The tail reaches 1.22 × radius; the extra margin keeps the grainy edge.
  const pad = radius * 1.3 + 12;
  b.grain.setAttribute('x', (cx - pad).toFixed(1));
  b.grain.setAttribute('y', (cy - pad).toFixed(1));
  b.grain.setAttribute('width', (pad * 2).toFixed(1));
  b.grain.setAttribute('height', (pad * 2).toFixed(1));
  const spread = 0.4;

  const pt = (angle, dist) =>
    `${(cx + Math.cos(angle) * dist).toFixed(1)} ${(
      cy +
      Math.sin(angle) * dist
    ).toFixed(1)}`;

  b.tail.setAttribute(
    'd',
    `M${pt(tailAngle - spread * 0.8, radius * 0.9)}
    L${pt(tailAngle, radius + len)}
    L${pt(tailAngle + spread * 0.2, radius * 0.9)}
    Z`
  );

  b.shadeTail.setAttribute('d', b.tail.getAttribute('d'));

  b.tail.setAttribute('fill', fill);

  b.pile.setAttribute(
    'transform',
    `translate(${cx.toFixed(1)} ${cy.toFixed(1)})
     scale(${(radius / 100).toFixed(4)})`
  );
}

const CORE_DARK = [30, 0, 22];

function tintBubble(b, darkness) {
  const base = wordRGB(darkness);

  const tones = [
    mixRGB(base, CORE_DARK, 0.18),
    mixRGB(base, CORE_DARK, 0.12),
    mixRGB(base, CORE_DARK, 0.05),
    base,
  ];

  tones.forEach((c, i) => b.stops[i].setAttribute('stop-color', css(c)));
  b.ink = css(mixRGB(base, CORE_DARK, 0.75));
  b.pile.setAttribute('fill', b.ink);
  b.tail.setAttribute('fill', css(base));
}


/* Web Audio
   The landing, hiss and pop sounds are generated in the browser rather than
   loaded as separate audio files. The Class 7 sound material helped me think
   about sound as interaction feedback; here I use it to make clicks and pops
   feel more physical. AudioContext starts after user interaction because of
   browser autoplay restrictions.

   Course: Class 7 — Sounds on the web
   https://rmit.instructure.com/courses/163616/modules/items/8496433

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
   https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
*/

const sfx = (() => {
  let ctx = null;
  let out = null;
  let noise = null;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      return;
    }

    const AC = window.AudioContext || window.webkitAudioContext;

    if (!AC) return;

    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.6;
    out.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  function envelope(gain, t, peak, attack, release) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  }

  function noiseBurst(type, f0, f1, peak, dur, attack) {
    if (!ctx) return;

    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gain = ctx.createGain();
    envelope(gain, t, peak, attack || 0.02, dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);
  }

  function tone(type, f0, f1, peak, dur) {
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const gain = ctx.createGain();
    envelope(gain, t, peak, 0.01, dur);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    init,

    thud: (strength) => tone('sine', 140, 50, 0.6 * strength, 0.28),

    hiss: (amount) =>
      noiseBurst('highpass', 3000, 900, 0.18 * amount, 0.1 + 0.35 * amount),

    pop: () => {
      noiseBurst('highpass', 1800, 600, 1, 0.07, 0.002);
      tone('sine', 190, 55, 0.5, 0.14);
    },
  };
})();

const FIGURE = {
  x: 800,
  y: 800,
  scale: 1.5,
};

const POSE_KNEEL = {
  hip: [-2, -58],
  neck: [7, -112],

  frontKnee: [34, -52],
  frontFoot: [46, -8],
  frontToe: [56, 0],

  backKnee: [-22, -11],
  backFoot: [-48, -17],
  backToe: [-57, 0],

  leftElbow: [-32, -126],
  leftHand: [-28, -140],
  leftTip: [-28, -150],

  rightElbow: [42, -126],
  rightHand: [36, -140],
  rightTip: [36, -150],
};

const POSE_STAND = {
  hip: [0, -70],
  neck: [1, -124],

  frontKnee: [16, -38],
  frontFoot: [20, -8],
  frontToe: [30, 0],

  backKnee: [-16, -38],
  backFoot: [-20, -8],
  backToe: [-30, 0],

  leftElbow: [-36, -146],
  leftHand: [-32, -160],
  leftTip: [-31, -168],

  rightElbow: [38, -148],
  rightHand: [34, -161],
  rightTip: [33, -169],
};

const POSE_STRAIN = (() => {
  const shift = [2, 6];

  const pose = {
    hip: [0, -54],
    neck: [10, -106],

    frontKnee: [37, -47],
    frontFoot: [52, -8],
    frontToe: [62, 0],

    backKnee: [-22, -9],
    backFoot: [-49, -16],
    backToe: [-58, 0],
  };

  for (const key of [
    'leftElbow',
    'leftHand',
    'leftTip',
    'rightElbow',
    'rightHand',
    'rightTip',
  ]) {
    pose[key] = [POSE_KNEEL[key][0] + shift[0], POSE_KNEEL[key][1] + shift[1]];
  }

  return pose;
})();

const person = {
  p: 0.9,
  load: 0,
  jolt: 0,
  grip: 0,
  spread: 0,
};

function posePoint(key, amount) {
  const kneel = POSE_KNEEL[key];
  const strain = POSE_STRAIN[key];

  const low = [
    lerp(kneel[0], strain[0], person.load),
    lerp(kneel[1], strain[1], person.load),
  ];

  const standing = POSE_STAND[key];

  return [lerp(low[0], standing[0], amount), lerp(low[1], standing[1], amount)];
}

const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

const along = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];


/* Animated SVG figure
   The body is drawn from SVG paths and the same paths are updated between
   strained and more upright poses. This lets posture act as the progress
   feedback instead of adding a separate progress bar.

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorials/SVG_from_scratch/Paths
   https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
*/

const figureLayer = document.getElementById('figure');

const shapes = {};

const bodyLayer = svgEl(
  'g',
  {
    filter: 'url(#joinSmooth)',
  },
  figureLayer
);

for (const name of [
  'backLeg',
  'frontLeg',
  'shoes',
  'torso',
  'armLeft',
  'armRight',
  'handLeft',
  'handRight',
  'neck',
]) {
  shapes[name] = svgEl(
    'path',

    name.startsWith('arm')
      ? {
          class: 'arm',
        }
      : {},

    bodyLayer
  );
}

shapes.head = svgEl('path', {}, figureLayer);

function ellipsePath(centre, rx, ry, degrees) {
  const angle = (degrees * Math.PI) / 180;
  const points = [];

  for (let k = 0; k < 20; k++) {
    const t = (k / 20) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;

    points.push([
      centre[0] + x * Math.cos(angle) - y * Math.sin(angle),

      centre[1] + x * Math.sin(angle) + y * Math.cos(angle),
    ]);
  }

  return curveClosed(points);
}

function curveClosed(points) {
  const middle = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  let d = `M${fmt(middle(points[points.length - 1], points[0]))}`;

  for (let i = 0; i < points.length; i++) {
    d += ` Q${fmt(points[i])} ${fmt(
      middle(points[i], points[(i + 1) % points.length])
    )}`;
  }

  return d + ' Z';
}

function curveThrough(points, start) {
  let d = `${start} ${fmt(points[0])}`;

  for (let i = 1; i < points.length - 1; i++) {
    d += ` Q${fmt(points[i])} ${fmt(mid(points[i], points[i + 1]))}`;
  }

  return d + ` L${fmt(points[points.length - 1])}`;
}

function blockTaper(points, widths) {
  const left = [];
  const right = [];

  points.forEach((point, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const normal = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    const width = widths[i] / 2;
    left.push([point[0] + normal[0] * width, point[1] + normal[1] * width]);
    right.push([point[0] - normal[0] * width, point[1] - normal[1] * width]);
  });

  return 'M' + left.concat(right.reverse()).map(fmt).join(' L') + ' Z';
}

function taper(points, widths) {
  const left = [];
  const right = [];

  points.forEach((point, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const normal = [-(b[1] - a[1]) / length, (b[0] - a[0]) / length];
    const width = widths[i] / 2;
    left.push([point[0] + normal[0] * width, point[1] + normal[1] * width]);
    right.push([point[0] - normal[0] * width, point[1] - normal[1] * width]);
  });

  return (
    curveThrough(left, 'M') + ' ' + curveThrough(right.reverse(), 'L') + ' Z'
  );
}

const ARM = {
  upper: 27,
  lower: 29,
};

function elbowFor(shoulder, hand, outward) {
  let dx = hand[0] - shoulder[0];
  let dy = hand[1] - shoulder[1];
  let distance = Math.hypot(dx, dy) || 1;
  const reach = (ARM.upper + ARM.lower) * 0.93;

  if (distance > reach) {
    hand[0] = shoulder[0] + (dx / distance) * reach;
    hand[1] = shoulder[1] + (dy / distance) * reach;
    dx = hand[0] - shoulder[0];
    dy = hand[1] - shoulder[1];
    distance = reach;
  }

  const a = (ARM.upper ** 2 - ARM.lower ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, ARM.upper ** 2 - a ** 2));

  const base = [
    shoulder[0] + (dx / distance) * a,

    shoulder[1] + (dy / distance) * a,
  ];

  let perpendicular = [-dy / distance, dx / distance];

  if (Math.sign(perpendicular[0]) !== outward) {
    perpendicular = [-perpendicular[0], -perpendicular[1]];
  }

  return [
    base[0] + perpendicular[0] * height,

    base[1] + perpendicular[1] * height,
  ];
}

function drawFigure(time, dt, carrying, held) {
  const recovery = smooth(clamp(person.p - person.jolt, 0, 1));
  const strain = carrying ? (1 - recovery) * (0.6 + 0.6 * person.load) : 0;
  const tremble = (seed) => Math.sin(time * 37 + seed) * 0.9 * strain;
  const breath = Math.sin(time * 1.6) * 0.8;
  const P = {};

  for (const key in POSE_KNEEL) {
    P[key] = posePoint(key, recovery);
  }

  for (const key of ['neck', 'leftElbow', 'rightElbow']) {
    P[key][1] += breath;
  }

  for (const key of ['leftHand', 'leftTip']) {
    P[key][1] += tremble(1) + breath;
  }

  for (const key of ['rightHand', 'rightTip']) {
    P[key][1] += tremble(2) + breath;
  }

  const legShake = (seed) =>
    (Math.sin(time * 29 + seed) * 0.6 +
      Math.sin(time * 47 + seed * 1.7) * 0.4) *
    0.9 *
    strain *
    person.load;

  P.frontKnee[0] += legShake(5);
  P.frontKnee[1] += legShake(6) * 0.4;
  P.backKnee[0] += legShake(7) * 0.6;
  P.hip[0] += legShake(8) * 0.35;
  P.hip[1] += Math.abs(legShake(9)) * 0.3;
  const dx = P.neck[0] - P.hip[0];
  const dy = P.neck[1] - P.hip[1];
  const length = Math.hypot(dx, dy) || 1;
  const up = [dx / length, dy / length];
  const normal = [-up[1], up[0]];

  const side = (point, width) => [
    point[0] + normal[0] * width,

    point[1] + normal[1] * width,
  ];

  const shoulderLine = [P.neck[0] - up[0] * 7, P.neck[1] - up[1] * 7];
  const across = [lerp(normal[0], 1, 0.7), lerp(normal[1], 0, 0.7)];
  const acrossLength = Math.hypot(across[0], across[1]) || 1;

  const level = (width) => [
    shoulderLine[0] + (across[0] / acrossLength) * width,

    shoulderLine[1] + (across[1] / acrossLength) * width,
  ];

  const leftShoulder = level(-16);
  const rightShoulder = level(16);
  leftShoulder[1] -= 3;
  rightShoulder[1] -= 3;
  const hipLow = [P.hip[0] - up[0] * 4, P.hip[1] - up[1] * 4];

  const inside = (point, width, depth) =>
    side([point[0] + up[0] * depth, point[1] + up[1] * depth], width);

  const kneeUp = smooth(clamp((-P.backKnee[1] - 12) / 14, 0, 1));
  const heelUp = kneeUp * (1 - smooth(clamp((recovery - 0.72) / 0.2, 0, 1)));

  const backAnkle = [
    P.backFoot[0],

    lerp(lerp(P.backFoot[1], -8, kneeUp), -17, heelUp),
  ];

  shapes.backLeg.setAttribute(
    'd',

    blockTaper(
      [inside(P.hip, -4, 12), side(P.hip, -8), P.backKnee, backAnkle],

      [18, 19, 16, 14]
    )
  );

  shapes.frontLeg.setAttribute(
    'd',

    blockTaper(
      [inside(P.hip, 4, 12), side(P.hip, 8), P.frontKnee, P.frontFoot],

      [18, 19, 16, 14]
    )
  );

  const footWedge = (ankle, toeX) => {
    const direction = Math.sign(toeX - ankle[0]) || 1;

    const points = [
      [ankle[0] - direction * 6, ankle[1] + 3],

      [toeX - direction * 7, 1],

      [toeX + direction * 9, 1],

      [toeX + direction * 8, -5],

      [ankle[0] + direction * 6, ankle[1] - 4],
    ];

    return 'M' + points.map(fmt).join(' L') + ' Z';
  };

  const backToeX = lerp(
    lerp(P.backToe[0], backAnkle[0] - 10, kneeUp),

    backAnkle[0] - 5,

    heelUp
  );

  shapes.shoes.setAttribute(
    'd',

    footWedge(backAnkle, backToeX) + ' ' + footWedge(P.frontFoot, P.frontToe[0])
  );

  const bend = person.load * (1 - recovery);

  const hunch = (amount, distance) =>
    side(along(P.hip, P.neck, amount), -distance * bend);

  shapes.torso.setAttribute(
    'd',

    taper(
      [hipLow, hunch(0.45, 3), hunch(0.8, 6), shoulderLine, P.neck],

      [32, 30, 34, 36, 12]
    )
  );

  person.grip = lerp(person.grip, held ? 1 : 0, follow(5, dt));
  person.spread = lerp(person.spread, held ? 30 : 0, follow(4, dt));
  const gripY = shoulderLine[1] - 48 + breath;
  let gripLeft = [shoulderLine[0] - person.spread, gripY + tremble(1)];
  let gripRight = [shoulderLine[0] + person.spread, gripY + tremble(2)];
  const reach = 46;

  gripLeft[0] = clamp(
    gripLeft[0],
    shoulderLine[0] - reach,
    shoulderLine[0] - 6
  );

  gripRight[0] = clamp(
    gripRight[0],
    shoulderLine[0] + 6,
    shoulderLine[0] + reach
  );

  const handEase = person.handL ? follow(5, dt) : 1;

  person.handL = person.handL
    ? along(person.handL, gripLeft, handEase)
    : gripLeft.slice();

  person.handR = person.handR
    ? along(person.handR, gripRight, handEase)
    : gripRight.slice();

  const handLeft = along(P.leftTip, person.handL, person.grip);
  const handRight = along(P.rightTip, person.handR, person.grip);
  const elbowLeft = elbowFor(leftShoulder, handLeft, -1);
  const elbowRight = elbowFor(rightShoulder, handRight, 1);

  const arm = (direction, shoulder, elbow, hand) =>
    'M' +
    [[shoulder[0] - direction * 12, shoulder[1] + 9], shoulder, elbow, hand]
      .map(fmt)
      .join(' L');

  shapes.armLeft.setAttribute('d', arm(-1, leftShoulder, elbowLeft, handLeft));

  shapes.armRight.setAttribute(
    'd',
    arm(1, rightShoulder, elbowRight, handRight)
  );

  const palm = (hand, elbow) => {
    const direction = [hand[0] - elbow[0], hand[1] - elbow[1]];
    const handLength = Math.hypot(direction[0], direction[1]) || 1;
    const normalised = [direction[0] / handLength, direction[1] / handLength];
    const centre = [hand[0] - normalised[0] * 3, hand[1] - normalised[1] * 3];
    const angle = Math.atan2(normalised[1], normalised[0]) * 57.3;

    return ellipsePath(centre, 6, 7.4, angle);
  };

  shapes.handLeft.setAttribute('d', palm(handLeft, elbowLeft));
  shapes.handRight.setAttribute('d', palm(handRight, elbowRight));
  const headAngle = Math.atan2(up[0], -up[1]) * 0.5 + 0.15 * bend;
  const c = Math.cos(headAngle);
  const s = Math.sin(headAngle);
  const top = [P.neck[0] + up[0] * 6, P.neck[1] + up[1] * 6 + tremble(3) * 0.5];
  const squash = 1 + 0.05 * Math.sin(time * 1.6) - 0.06 * bend;
  const local = (x, y) => [top[0] + (x * c - y * s), top[1] + (x * s + y * c)];
  const headRadius = 12;
  const headCentre = local(0, -2 - headRadius * squash);

  shapes.head.setAttribute(
    'd',

    ellipsePath(
      headCentre,

      headRadius / squash,

      headRadius * squash,

      Math.atan2(s, c) * 57.3
    )
  );

  shapes.neck.setAttribute(
    'd',

    taper(
      [along(P.neck, shoulderLine, 0.6), local(0, 1)],

      [12, 11]
    )
  );

  const handX = (handLeft[0] + handRight[0]) / 2;
  const handY = Math.min(handLeft[1], handRight[1]) - 2;

  return {
    x: FIGURE.x + handX * FIGURE.scale,

    y: FIGURE.y + handY * FIGURE.scale,

    spread: (Math.abs(handRight[0] - handLeft[0]) / 2) * FIGURE.scale,
  };
}

const burden = document.getElementById('burden');

const burdenShadow = document.getElementById('burdenShadow');

const effects = document.getElementById('effects');

const ending = {
  t: -1,
  landed: 0,
  laidOut: false,

  rows: [
    {
      text: 'the weight.',
      dx: 0,
    },

    {
      text: 'carries',
      dx: 12,
    },

    {
      text: 'always',
      dx: -10,
    },

    {
      text: 'someone',
      dx: 6,
    },
  ],

  pieces: [],
};

const LINE_PITCH = 36;

(function makeEndLetters() {
  const group = document.getElementById('endWords');
  let order = 0;

  ending.rows.forEach((row, i) => {
    row.pieces = [];

    for (const character of row.text) {
      const piece = {
        row: i,

        ch: character,

        order: order++,

        rot: rand(-7, 7),

        sx: rand(0.97, 1.03),

        sy: rand(0.97, 1.04),

        jy: rand(-2.5, 2.5),

        x: 0,
        landed: false,
        y: 0,
        vy: 0,
        squash: 0,
        squashT: 0,
      };

      if (character !== ' ') {
        piece.el = svgEl(
          'text',
          {
            'text-anchor': 'middle',

            'aria-hidden': 'true',

            opacity: 0,
          },
          group
        );

        piece.el.textContent = character;
      }

      row.pieces.push(piece);
      ending.pieces.push(piece);
    }
  });
})();

const LETTER_GAP = 3;
const WORD_GAP = 12;


/* Ending typography
   The final sentence is built letter by letter. measureText() and
   getComputedStyle() help keep the spacing readable even after the letters
   receive slightly different rotation and scale.

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText
   https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
*/

function inkOf(character) {
  try {
    if (!inkOf.ctx) {
      inkOf.ctx = document.createElement('canvas').getContext('2d');
      const sample = ending.pieces.find((piece) => piece.el);
      const style = getComputedStyle(sample.el);
      inkOf.ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    }

    const measurement = inkOf.ctx.measureText(character);
    const left = measurement.actualBoundingBoxLeft;
    const right = measurement.actualBoundingBoxRight;

    return {
      width: left + right,

      shift: (right - left) / 2 - measurement.width / 2,
    };
  } catch (error) {
    return {
      width: 18,
      shift: 0,
    };
  }
}

function layOutEndLetters() {
  for (const row of ending.rows) {
    const ink = row.pieces.map((piece) => (piece.el ? inkOf(piece.ch) : null));

    const widths = ink.map((measurement) =>
      measurement ? measurement.width + LETTER_GAP : WORD_GAP
    );

    const total = widths.reduce((sum, width) => sum + width, 0);
    let x = -total / 2;

    row.pieces.forEach((piece, index) => {
      piece.x =
        row.dx + x + widths[index] / 2 - (ink[index] ? ink[index].shift : 0);

      x += widths[index];
    });
  }

  ending.laidOut = true;
}

const hint = document.getElementById('hint');

const SIZES = [124, 122, 122, 118, 114];

const SPOTS = {
  base: null,

  L: {
    on: 'base',
    angle: -0.72,
  },

  R: {
    on: 'base',
    angle: 0.66,
  },

  LT: {
    on: 'L',
    angle: 0.5,
  },

  RT: {
    on: 'R',
    angle: 0.12,
  },
};

const SPOT_BY_RANK = ['base', 'L', 'R', 'LT', 'RT'];

const NESTLE = 0.66;

const pile = {
  key: '',
};

function onHands(hands, radius) {
  const distance = Math.min(hands.spread, radius * 0.85);

  return hands.y - Math.sqrt(radius * radius - distance * distance);
}

function resettle(stack) {
  if (!stack.length) {
    return;
  }

  const base =
    stack.find((word) => word.spot === 'base') ||
    stack.reduce(
      (lowest, word) => (word.y > lowest.y ? word : lowest),

      stack[0]
    );

  const others = stack
    .filter((word) => word !== base)
    .sort((a, b) => b.y - a.y);

  const fill = (words, left, right) => {
    if (words.length === 2) {
      const pair = words.slice().sort((a, b) => a.x - b.x);
      pair[0].spot = left;
      pair[1].spot = right;
    } else if (words.length === 1) {
      words[0].spot = words[0].x < base.x ? left : right;
    }
  };

  base.spot = 'base';
  fill(others.slice(0, 2), 'L', 'R');
  fill(others.slice(2, 4), 'LT', 'RT');
}

function stackLayout(hands, stack) {
  if (!stack.every((word) => word.landed)) {
    stack.forEach((word) => {
      word.spot = SPOT_BY_RANK[word.rank];
    });

    pile.key = '';
  } else {
    const key = stack.map((word) => word.rank).join(',');

    if (key !== pile.key) {
      pile.key = key;
      resettle(stack);
    }
  }

  const positions = {};

  const place = (name) => {
    if (positions[name]) {
      return positions[name];
    }

    const word = stack.find((item) => item.spot === name);

    if (!word) {
      return null;
    }

    const spot = SPOTS[name];

    if (!spot) {
      positions[name] = {
        x: hands.x,

        y: onHands(hands, word.r),
      };
    } else {
      const below = place(spot.on);
      const under = stack.find((item) => item.spot === spot.on);

      if (!below) {
        positions[name] = {
          x: hands.x,

          y: onHands(hands, word.r),
        };
      } else {
        const distance = (under.r + word.r) * NESTLE;

        positions[name] = {
          x: below.x + Math.sin(spot.angle) * distance,

          y: below.y - Math.cos(spot.angle) * distance,
        };
      }
    }

    return positions[name];
  };

  return stack.map((word) => place(word.spot));
}

const DARKNESS = [0.98, 0.86, 0.74, 0.62, 0.52].map((value) =>
  clamp(value + rand(-0.04, 0.04), 0, 1)
);

const FALL_START = 1.0;
const FALL_GAP = 0.6;

const scene = {
  t: 0,

  words: [],
  effects: [],
  heap: {},

  totalWeight: 0,
  removedWeight: 0,

  allLanded: false,
  finished: false,
};

scene.words = DARKNESS.map((darkness, rank) => {
  const weight = 0.5 + darkness;
  scene.totalWeight += weight;

  return {
    rank,
    slot: rank,

    spot: SPOT_BY_RANK[rank],

    d0: darkness,

    d: darkness,

    dTarget: darkness,

    r0: SIZES[rank],

    r: SIZES[rank],

    rTarget: SIZES[rank],

    tail: rank % 2 === 0 ? 2.25 : 0.9,

    x: 0,
    y: 0,

    vx: 0,
    vy: 0,

    drift: rand(-60, 60),

    released: false,
    landed: false,

    squash: 0,
    squashT: 0,

    hits: 0,

    needed: 6 + Math.round(darkness * 4),

    popping: 0,
    gone: false,

    weight,
  };
});


/* Main click interaction
   Click is the main action in this prototype. I used addEventListener() from
   the Class 5 interaction material to attach the same click behaviour directly
   to every speech bubble.

   Each click increases the bubble's hit count and calculates how much of it is
   left. That value becomes a new rTarget and dTarget, so the bubble gets smaller
   and lighter with repeated clicks. I do not change the SVG radius and colour
   instantly. The animation loop gradually moves the current values toward those
   targets, which makes each click feel like it is slowly reducing the weight.

   Darker bubbles are given a higher required click count. This means the amount
   of effort is also part of the meaning: heavier words are harder to remove.

   Course: Class 5 — Interactivity with Javascript
   https://rmit.instructure.com/courses/163616/modules/items/8496408

   MDN:
   EventTarget.addEventListener()
   https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener

   Window.requestAnimationFrame()
   https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

   Element.setAttribute()
   https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
*/

for (let k = scene.words.length - 1; k >= 0; k--) {
  const word = scene.words[k];
  word.phrases = SAYINGS[SAYINGS.length - 1 - word.rank];
  word.view = makeBubble(burden, '', word.phrases, word.d0);
  word.view.g.style.display = 'none';
  word.view.shade.style.display = 'none';
  word.view.g.addEventListener('click', () => lighten(word));
}

function lighten(word) {
  if (!scene.allLanded || word.popping || word.gone) {
    return;
  }

  sfx.init();
  word.hits++;
  hint.classList.add('is-hidden');
  const left = 1 - word.hits / word.needed;

  if (left <= 0) {
    word.popping = 0.001;
    scene.removedWeight += word.weight;
    word.view.g.classList.remove('clickable');
  } else {
    word.rTarget = word.r0 * (0.45 + 0.55 * left);
    word.dTarget = lerp(0.15, word.d0, left);
    word.squash = 0.06;
    word.squashT = 0;
    sfx.hiss(0.45);
  }
}

function aimTails() {
  const positions = {};

  for (const name of SPOT_BY_RANK) {
    const rank = SPOT_BY_RANK.indexOf(name);
    const radius = SIZES[rank];
    const spot = SPOTS[name];

    if (!spot) {
      positions[name] = {
        x: 0,

        y: -radius * 0.85,

        r: radius,
      };
    } else {
      const below = positions[spot.on];
      const distance = (below.r + radius) * NESTLE;

      positions[name] = {
        x: below.x + Math.sin(spot.angle) * distance,

        y: below.y - Math.cos(spot.angle) * distance,

        r: radius,
      };
    }
  }

  const placed = SPOT_BY_RANK.map((name) => positions[name]);

  scene.words.forEach((word) => {
    const me = placed[word.rank];
    let best = word.tail;
    let bestScore = -Infinity;

    for (let k = 0; k < 24; k++) {
      const angle = (k / 24) * Math.PI * 2;
      const tipX = me.x + Math.cos(angle) * me.r * 1.2;
      const tipY = me.y + Math.sin(angle) * me.r * 1.2;
      let clear = Infinity;

      placed.forEach((other, index) => {
        if (index !== word.rank) {
          clear = Math.min(
            clear,

            Math.hypot(
              tipX - other.x,

              tipY - other.y
            ) - other.r
          );
        }
      });

      clear = Math.min(
        clear,

        Math.hypot(tipX, tipY - 40) - 70
      );

      const score = Math.min(clear, 40) + Math.sin(angle) * 12;

      if (score > bestScore) {
        bestScore = score;
        best = angle;
      }
    }

    word.tail = best;
  });
}

aimTails();

function jostle() {
  const currentPile = scene.words.filter(
    (word) => word.landed && !word.gone && !word.popping
  );

  for (let i = 0; i < currentPile.length; i++) {
    for (let j = i + 1; j < currentPile.length; j++) {
      const a = currentPile[i];
      const b = currentPile[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const closest = (a.r + b.r) * NESTLE * 0.97;

      if (distance >= closest) {
        continue;
      }

      const nx = dx / distance;
      const ny = dy / distance;
      const massA = a.r * a.r;
      const massB = b.r * b.r;
      const push = (closest - distance) * 0.5;
      a.x -= nx * push * (massB / (massA + massB));
      a.y -= ny * push * (massB / (massA + massB));
      b.x += nx * push * (massA / (massA + massB));
      b.y += ny * push * (massA / (massA + massB));
      const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

      if (closing < 0) {
        a.vx += nx * closing * (massB / (massA + massB));
        a.vy += ny * closing * (massB / (massA + massB));
        b.vx -= nx * closing * (massA / (massA + massB));
        b.vy -= ny * closing * (massA / (massA + massB));
      }
    }
  }
}

function shock(from, radius) {
  for (const word of scene.words) {
    if (word === from || !word.landed || word.gone || word.popping) {
      continue;
    }

    const dx = word.x - from.x;
    const dy = word.y - from.y;
    const distance = Math.hypot(dx, dy) || 0.001;
    const reach = (radius + word.r) * 1.25;

    if (distance >= reach) {
      continue;
    }

    const strength = 520 * (1 - distance / reach);
    word.vx += (dx / distance) * strength;
    word.vy += (dy / distance) * strength * 0.6 - 40;
    word.squash = 0.08;
    word.squashT = 0;
  }
}


/* Text burst after the final click
   When the last required click is reached, I did not want the speech bubble to
   simply disappear. burst() creates new SVG <text> elements from the phrases
   that were inside the bubble, so the words become separate objects.

   I used Math.random() to give the fragments different starting positions,
   speeds and rotations. updateEffects() then adds downward velocity and updates
   each fragment's SVG transform every frame. The fragments eventually settle
   on the floor instead of being deleted.

   This was important to the concept: the user can remove the visible bubble,
   but the words still leave a trace in the scene.

   MDN:
   Document.createElementNS()
   https://developer.mozilla.org/en-US/docs/Web/API/Document/createElementNS

   Math.random()
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

   SVG transform
   https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/transform

   Element.setAttribute()
   https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute
*/

function burst(word, radius, colour, opacity) {
  sfx.pop();
  const count = 22;

  for (let k = 0; k < count; k++) {
    const angle = rand(0, Math.PI * 2);
    const distance = radius * Math.sqrt(Math.random()) * 0.8;

    const text = svgEl(
      'text',
      {
        class: 'spill',

        'font-size': rand(9, 13).toFixed(1),

        'text-anchor': 'middle',
      },
      effects
    );

    const calm = Math.random() < 0.35;
    text.textContent = word.phrases[k % word.phrases.length];

    scene.effects.push({
      kind: 'spill',

      el: text,

      x: word.x + Math.cos(angle) * distance,

      y: word.y + Math.sin(angle) * distance,

      vx: Math.cos(angle) * rand(30, 140),

      vy: Math.sin(angle) * rand(20, 80) - rand(40, 120),

      rot: calm ? rand(-8, 8) : rand(-180, 180),

      vr: calm ? rand(-15, 15) : rand(-420, 420),

      age: 0,

      life: Infinity,

      opacity,
    });
  }

  scene.effects.push({
    kind: 'ring',

    el: svgEl(
      'circle',
      {
        cx: word.x.toFixed(1),

        cy: word.y.toFixed(1),

        r: radius.toFixed(1),

        fill: 'none',

        stroke: PALE,

        'stroke-width': 3,
      },
      effects
    ),

    r: radius,

    age: 0,

    life: 0.22,
  });
}

function updateEffects(dt) {
  scene.effects = scene.effects.filter((effect) => {
    effect.age += dt;
    const progress = effect.age / effect.life;

    if (effect.kind === 'ring') {
      if (progress >= 1) {
        effect.el.remove();

        return false;
      }

      effect.el.setAttribute(
        'r',

        (effect.r * (1 + 0.35 * smooth(progress))).toFixed(1)
      );

      effect.el.setAttribute(
        'opacity',

        (0.3 * (1 - progress)).toFixed(3)
      );

      return true;
    }

    if (effect.kind === 'spill') {
      if (!effect.down) {
        effect.vy += 900 * dt;
        effect.vx *= Math.exp(-0.8 * dt);
        effect.x += effect.vx * dt;
        effect.y += effect.vy * dt;
        effect.rot += effect.vr * dt;
        const bucket = Math.round(effect.x / 24);
        const floor = FIGURE.y + 14 - (scene.heap[bucket] || 0);

        if (effect.y >= floor) {
          effect.y = floor;

          if (effect.vy > 160) {
            effect.vy *= -0.3;
            effect.vr *= 0.4;
          } else {
            effect.down = true;
            scene.heap[bucket] = (scene.heap[bucket] || 0) + 4.5;
          }
        }
      } else {
        effect.vx *= Math.exp(-6 * dt);
        effect.x += effect.vx * dt;
      }

      effect.el.setAttribute(
        'transform',

        `translate(${effect.x.toFixed(1)} ${effect.y.toFixed(1)})
               rotate(${effect.rot.toFixed(1)})`
      );

      effect.el.setAttribute(
        'opacity',

        (effect.opacity * Math.min(1, effect.age * 6)).toFixed(3)
      );

      return true;
    }

    return true;
  });
}

function update(dt, time) {
  scene.t += dt;
  const carrying = scene.words.some((word) => word.landed && !word.gone);

  const onPile = scene.words.filter(
    (word) => word.landed && !word.popping && !word.gone
  );

  const held =
    onPile.find((word) => word.spot === 'base') ||
    onPile.sort((a, b) => a.rank - b.rank)[0] ||
    null;

  const load =
    scene.words
      .filter((word) => word.landed && !word.gone)
      .reduce(
        (sum, word) => sum + word.weight * Math.min(1, word.r / word.r0) ** 2,

        0
      ) / scene.totalWeight;

  person.load = lerp(
    person.load,

    load + ending.landed * 0.07,

    follow(2.5, dt)
  );

  const hands = drawFigure(time, dt, carrying, held);
  updateEnding(dt, hands);
  updateEffects(dt);

  const remaining = scene.words
    .filter((word) => !word.popping && !word.gone)
    .sort((a, b) => a.rank - b.rank);

  remaining.forEach((word, index) => {
    word.slot = index;
  });

  const layout = stackLayout(hands, remaining);
  let landedWeight = 0;

  for (const word of scene.words) {
    if (word.gone) {
      continue;
    }

    const place = word.popping
      ? {
          x: word.x,

          y: word.y,
        }
      : layout[word.slot];

    const targetX = place.x;
    const targetY = place.y;

    if (!word.released) {
      if (scene.t < FALL_START + word.rank * FALL_GAP) {
        continue;
      }

      word.released = true;
      word.x = targetX + word.drift;
      word.y = targetY - 1300;
      word.fromY = word.y;
      word.view.g.style.display = '';
      word.view.shade.style.display = '';
    }

    if (!word.landed) {
      word.vy += 1700 * dt;
      word.y += word.vy * dt;

      const progress = smooth(
        clamp((word.y - word.fromY) / (targetY - word.fromY), 0, 1)
      );

      word.x = lerp(targetX + word.drift, targetX, progress);

      if (word.y >= targetY) {
        word.y = targetY;
        word.squash = clamp(word.vy / 9000, 0.03, 0.16);
        word.squashT = 0;
        person.jolt = Math.max(person.jolt, 0.05 + word.weight * 0.04);
        sfx.thud(0.3);

        if (word.vy > 260) {
          word.vy *= -0.22;
        } else {
          word.vy = 0;
          word.landed = true;
        }
      }
    } else {
      const drop = targetY - word.y;
      const ax = (targetX - word.x) * 45 - word.vx * 7;
      const ay = drop > 12 ? 1500 - word.vy * 0.6 : drop * 60 - word.vy * 11;

      if (word.fallingIn && drop <= 12 && word.vy > 250) {
        word.squash = Math.min(0.12, word.vy / 6000);
        word.squashT = 0;
      }

      word.fallingIn = drop > 12;
      word.vx += ax * dt;
      word.vy += ay * dt;
      word.x += word.vx * dt;
      word.y += word.vy * dt;
      landedWeight += word.weight;
    }

    word.r = lerp(word.r, word.rTarget, follow(5, dt));
    word.d = lerp(word.d, word.dTarget, follow(4, dt));
    word.squashT += dt;

    const wobble =
      word.squash * Math.exp(-7 * word.squashT) * Math.cos(16 * word.squashT);

    let radius = word.r;
    const colour = wordColor(word.d);
    const opacity = 1;

    if (word.popping) {
      word.popping += dt;
      radius *= 1 + 0.07 * smooth(clamp(word.popping / 0.07, 0, 1));

      if (word.popping >= 0.07) {
        burst(word, radius, colour, opacity);
        shock(word, radius);
        word.gone = true;
        word.view.g.remove();
        word.view.shade.remove();

        continue;
      }
    }

    const scaleX = 1 + wobble;
    const scaleY = 1 - wobble;

    const squashTransform = `translate(${word.x.toFixed(1)} ${word.y.toFixed(1)})
         scale(${scaleX.toFixed(4)} ${scaleY.toFixed(4)})
         translate(${(-word.x).toFixed(1)} ${(-word.y).toFixed(1)})`;

    word.view.g.setAttribute('transform', squashTransform);
    word.view.shade.setAttribute('transform', squashTransform);

    word.view.g.setAttribute('opacity', opacity.toFixed(3));
    drawBubble(word.view, word.x, word.y, radius, colour, word.tail);
    tintBubble(word.view, word.d);
  }

  jostle();

  if (!scene.allLanded && scene.words.every((word) => word.landed)) {
    scene.allLanded = true;

    scene.words.forEach((word) => {
      word.view.g.classList.add('clickable');
    });

    setTimeout(() => {
      hint.classList.remove('is-hidden');
    }, 600);
  }

  const target = scene.allLanded
    ? 0.9 * (scene.removedWeight / scene.totalWeight)
    : 0.9 * (1 - landedWeight / scene.totalWeight);

  person.p = lerp(
    person.p,

    target - ending.landed * 0.09,

    follow(2.2, dt)
  );

  person.jolt = lerp(person.jolt, 0, follow(4, dt));

  if (
    scene.allLanded &&
    !scene.finished &&
    scene.words.every((word) => word.gone)
  ) {
    scene.finished = true;
    ending.t = -1.2;
  }
}


/* Ending
   After the bubbles are removed, the sentence becomes the final object on the
   figure's hands. The person still does not return to a completely relaxed
   pose, so removing the visible words does not erase their effect. */

const APPEAR = 0.55;
const TITLE_AT = 0;
const TITLE_SIZE = 2.8;

const titleGroup = document.getElementById('title');

const titleNoise = ['titleSizzle', 'titleFibre'].map((id) =>
  document.getElementById(id)
);

let sizzleT = 0;

(function handLetterTitle() {
  const text = document.getElementById('titleText');

  if (!text || !text.textContent) {
    return;
  }

  const length = text.textContent.length;
  const rotate = [];
  const dy = [];
  let lift = 0;

  for (let i = 0; i < length; i++) {
    rotate.push(rand(-6, 6).toFixed(1));
    const next = rand(-1.6, 1.6);
    dy.push((next - lift).toFixed(2));
    lift = next;
  }

  text.setAttribute('rotate', rotate.join(' '));
  text.setAttribute('dy', dy.join(' '));
})();

const HOVER = 0.7;
const CASCADE = 0.03;

function swell(value) {
  if (value < 0.45) {
    return lerp(0.85, 1.2, smooth(value / 0.45));
  }

  return lerp(1.2, 1, smooth((value - 0.45) / 0.55));
}

function updateEnding(dt, hands) {
  if (!scene.finished) {
    return;
  }

  ending.t += dt;

  if (ending.t < 0) {
    return;
  }

  const progress = clamp(ending.t / APPEAR, 0, 1);
  const titleTime = ending.t - TITLE_AT;

  if (titleTime >= 0) {
    sizzleT += dt;

    if (sizzleT > 0.14) {
      sizzleT = 0;

      titleNoise.forEach((element) => {
        element.setAttribute(
          'seed',

          String(1 + Math.floor(Math.random() * 200))
        );
      });
    }

    const titleProgress = clamp(titleTime / APPEAR, 0, 1);

    titleGroup.setAttribute(
      'opacity',

      smooth(clamp(titleTime / (APPEAR * 0.4), 0, 1)).toFixed(3)
    );

    titleGroup.setAttribute(
      'transform',

      `translate(800 330)
         scale(${(TITLE_SIZE * swell(titleProgress)).toFixed(3)})`
    );
  }

  if (!ending.laidOut) {
    layOutEndLetters();
  }

  const letters = ending.pieces.filter((piece) => piece.el);

  for (const piece of letters) {
    const row = piece.row;
    const targetY = hands.y - 6 - row * LINE_PITCH + piece.jy;
    const hoverY = targetY - 40 - row * 6;

    if (ending.t < HOVER + piece.order * CASCADE) {
      piece.y = hoverY;
    } else if (!piece.landed) {
      piece.vy += 1700 * dt;
      piece.y += piece.vy * dt;

      if (piece.y >= targetY) {
        piece.y = targetY;

        if (piece.vy > 200) {
          if (piece.squash === 0) {
            person.jolt = Math.max(person.jolt, 0.08);
          }

          piece.squash = 0.16;
          piece.squashT = 0;
          piece.vy *= -0.25;
        } else {
          piece.vy = 0;
          piece.landed = true;
          ending.landed += 4 / letters.length;
        }
      }
    } else {
      piece.y = lerp(piece.y, targetY, follow(12, dt));
    }

    piece.squashT += dt;

    const give =
      piece.squash *
      Math.exp(-8 * piece.squashT) *
      Math.cos(18 * piece.squashT);

    const size = swell(progress);
    const x = hands.x + piece.x;

    piece.el.setAttribute(
      'opacity',

      smooth(clamp(ending.t / (APPEAR * 0.4), 0, 1)).toFixed(3)
    );

    piece.el.setAttribute(
      'transform',

      `translate(${x.toFixed(1)} ${piece.y.toFixed(1)})
         rotate(${piece.rot.toFixed(1)})
         scale(${(size * piece.sx * (1 + give * 0.6)).toFixed(3)}
         ${(size * piece.sy * (1 - give)).toFixed(3)})`
    );
  }
}


/* Animation loop
   I used the Class 9 animation material when developing the gradual feedback:
   bubbles fall and squash, the figure changes posture, and the ending settles
   instead of switching instantly between states. requestAnimationFrame() and
   performance.now() keep these changes running from the same frame timing.

   Course: Class 9 — Animations and transitions
   https://rmit.instructure.com/courses/163616/modules/items/8496439

   MDN:
   https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
   https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
*/

let lastFrame = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt, now / 1000);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
