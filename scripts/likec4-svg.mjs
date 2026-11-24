// Draws the views of a LikeC4 model as static, themeable SVG.
//
// LikeC4 reads the model and computes the layout (Graphviz, WebAssembly
// build): the position and size of every element and the route of every
// relationship. LikeC4 draws a view only in the browser, with React, so this
// file draws the computed layout itself. It writes one class name per kind of
// element and relationship. The site style sheet (`src/styles/diagrams.css`)
// sets colours, strokes and fonts from the theme of the site.

import { LikeC4 } from "likec4";

const FONT_SIZE = 14;
const SMALL_FONT_SIZE = 12;
const LINE_HEIGHT = 1.3;
// Average advance of Montserrat, as a fraction of the font size.
const CHARACTER_WIDTH = 0.62;
const PADDING = 12;

/** Shape drawn for each kind of element: the shared visual vocabulary. */
const SHAPES = {
  repository: "rectangle",
  subsystem: "rectangle",
  library: "rectangle",
  executable: "rectangle",
  application: "rectangle",
  driver: "hexagon",
  hardware: "hexagon",
  storage: "cylinder",
  record: "document",
  key: "oval",
};

/** Kinds of element that show a frame instead of a box when they hold others. */
const BOUNDARY_KINDS = new Set(["repository"]);

let modelPromise;

/**
 * Layout of every view of the model in `directory`, by identifier. The layout
 * is computed once for each build.
 */
export function loadViews(directory) {
  modelPromise ??= (async () => {
    const workspace = await LikeC4.fromWorkspace(directory, {
      graphviz: "wasm",
      logger: false,
    });
    const errors = workspace.getErrors();
    if (errors.length > 0) {
      throw new Error(
        `LikeC4 model errors:\n${errors
          .map(
            (error) => `${error.sourceFsPath}:${error.line}: ${error.message}`,
          )
          .join("\n")}`,
      );
    }
    const model = await workspace.layoutedModel();
    return Object.fromEntries(
      [...model.views()].map((view) => [view.id, view.$view]),
    );
  })();
  return modelPromise;
}

const escape = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const round = (value) => Math.round(value * 10) / 10;

function wrap(text, width, fontSize) {
  const limit = Math.max(8, Math.floor(width / (fontSize * CHARACTER_WIDTH)));
  const lines = [];
  for (const paragraph of String(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && (line + " " + word).length > limit) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function textLines(lines, x, y, fontSize, className) {
  return lines
    .map(
      (line, index) =>
        `<text class="${className}" x="${round(x)}" y="${round(
          y + index * fontSize * LINE_HEIGHT,
        )}" font-size="${fontSize}" text-anchor="middle">${escape(line)}</text>`,
    )
    .join("");
}

function outline(shape, x, y, width, height) {
  const right = x + width;
  const bottom = y + height;
  switch (shape) {
    case "cylinder": {
      const ry = Math.min(14, height / 6);
      return (
        `<path class="outline" d="M${x} ${y + ry}A${width / 2} ${ry} 0 0 1 ${right} ${y + ry}V${bottom - ry}A${width / 2} ${ry} 0 0 1 ${x} ${bottom - ry}Z"/>` +
        `<path class="outline" d="M${x} ${y + ry}A${width / 2} ${ry} 0 0 0 ${right} ${y + ry}"/>`
      );
    }
    case "hexagon": {
      const cut = Math.min(24, width / 6);
      return `<polygon class="outline" points="${x + cut},${y} ${right - cut},${y} ${right},${y + height / 2} ${right - cut},${bottom} ${x + cut},${bottom} ${x},${y + height / 2}"/>`;
    }
    case "oval":
      return `<ellipse class="outline" cx="${round(x + width / 2)}" cy="${round(y + height / 2)}" rx="${round(width / 2)}" ry="${round(height / 2)}"/>`;
    case "document": {
      const wave = Math.min(10, height / 8);
      return `<path class="outline" d="M${x} ${y}H${right}V${bottom - wave}C${x + width * 0.75} ${bottom - wave * 2.4} ${x + width * 0.6} ${bottom + wave * 0.6} ${x + width * 0.5} ${bottom - wave * 0.4}S${x + width * 0.25} ${bottom - wave * 1.6} ${x} ${bottom - wave}Z"/>`;
    }
    default:
      return `<rect class="outline" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
  }
}

function drawNode(node) {
  const kind = node.kind ?? "element";
  const shape = SHAPES[kind] ?? "rectangle";
  const { x, y, width, height } = node;

  // An element that holds other elements is a frame with its title at the top.
  if (node.children.length > 0) {
    const boundary = BOUNDARY_KINDS.has(kind) ? "boundary" : "layer";
    return (
      `<g class="node frame ${boundary} kind-${kind}" data-id="${escape(node.id)}">` +
      `<rect class="outline" x="${x}" y="${y}" width="${width}" height="${height}"/>` +
      `<text class="frame-title" x="${x + PADDING}" y="${y + PADDING + SMALL_FONT_SIZE}" font-size="${SMALL_FONT_SIZE}">${escape(node.title)}</text>` +
      `</g>`
    );
  }

  const focus = node.color === "amber" ? " focus" : "";
  const innerWidth = width - 2 * PADDING - (shape === "hexagon" ? 28 : 0);
  const titleLines = wrap(node.title, innerWidth, FONT_SIZE);
  const technology = node.technology ? `[${node.technology}]` : null;
  const description = node.description?.txt ?? "";
  const descriptionLines = wrap(description, innerWidth, SMALL_FONT_SIZE);

  // Show as much of the text as fits. The title always shows.
  const lineHeight = (size) => size * LINE_HEIGHT;
  const available = height - 2 * PADDING - (shape === "cylinder" ? 16 : 0);
  let used = titleLines.length * lineHeight(FONT_SIZE);
  const showTechnology =
    technology !== null && used + lineHeight(SMALL_FONT_SIZE) <= available;
  if (showTechnology) used += lineHeight(SMALL_FONT_SIZE);
  const room = Math.floor((available - used) / lineHeight(SMALL_FONT_SIZE));
  const shownDescription = room > 0 ? descriptionLines.slice(0, room) : [];
  if (
    shownDescription.length < descriptionLines.length &&
    shownDescription.length > 0
  ) {
    shownDescription[shownDescription.length - 1] += "…";
  }
  if (shownDescription.length > 0) {
    used += shownDescription.length * lineHeight(SMALL_FONT_SIZE);
  }

  const centre = x + width / 2;
  let cursor =
    y + (height - used) / 2 + FONT_SIZE * 0.95 + (shape === "cylinder" ? 8 : 0);
  let body = textLines(titleLines, centre, cursor, FONT_SIZE, "title");
  cursor += titleLines.length * lineHeight(FONT_SIZE);
  if (showTechnology) {
    body += textLines(
      [technology],
      centre,
      cursor - 2,
      SMALL_FONT_SIZE,
      "technology",
    );
    cursor += lineHeight(SMALL_FONT_SIZE);
  }
  if (shownDescription.length > 0) {
    body += textLines(
      shownDescription,
      centre,
      cursor - 2,
      SMALL_FONT_SIZE,
      "description",
    );
  }

  return (
    `<g class="node ${shape} kind-${kind}${focus}" data-id="${escape(node.id)}">` +
    outline(shape, x, y, width, height) +
    body +
    `</g>`
  );
}

function drawEdge(edge, number, arrow, routing) {
  const kind = edge.kind ?? "depends";
  // Consecutive equal points make the direction of the arrowhead undefined.
  const points = edge.points.filter(
    ([px, py], index, all) =>
      index === 0 || px !== all[index - 1][0] || py !== all[index - 1][1],
  );
  // A spline route is a list of points close to the curve. Smooth the corners
  // with quadratic curves through the middle of each segment.
  const spline = routing !== "ortho" && points.length > 2;
  let path;
  if (spline) {
    path = `M${round(points[0][0])} ${round(points[0][1])}`;
    for (let index = 1; index < points.length - 1; index++) {
      const [cx, cy] = points[index];
      const [nx, ny] = points[index + 1];
      const last = index === points.length - 2;
      const [ex, ey] = last ? [nx, ny] : [(cx + nx) / 2, (cy + ny) / 2];
      path += `Q${round(cx)} ${round(cy)} ${round(ex)} ${round(ey)}`;
    }
  } else {
    path = points
      .map(
        ([px, py], index) =>
          `${index === 0 ? "M" : "L"}${round(px)} ${round(py)}`,
      )
      .join("");
  }
  let output = `<g class="edge ${kind}${number ? " step" : ""}">`;
  output += `<path class="line" d="${path}" marker-end="url(#${arrow})"/>`;

  const label = edge.label?.trim();
  if (label || number) {
    // Anchor the label on the middle of the longest segment of the route.
    let anchor = { x: points[0][0], y: points[0][1], length: -1 };
    for (let index = 1; index < points.length; index++) {
      const [ax, ay] = points[index - 1];
      const [bx, by] = points[index];
      const length = Math.abs(bx - ax) + Math.abs(by - ay);
      if (length > anchor.length) {
        anchor = { x: (ax + bx) / 2, y: (ay + by) / 2, length };
      }
    }
    const box = { x: anchor.x, y: anchor.y, width: 0, height: 0 };
    const lines = label
      ? wrap(label.replace(/\s*\n\s*/g, " "), 230, SMALL_FONT_SIZE)
      : [];
    const badge = number ? 22 : 0;
    const textWidth = Math.max(
      0,
      ...lines.map((line) => line.length * SMALL_FONT_SIZE * CHARACTER_WIDTH),
    );
    const width = textWidth + badge + 12;
    const height = Math.max(
      badge,
      lines.length * SMALL_FONT_SIZE * LINE_HEIGHT + 6,
    );
    const left = box.x + box.width / 2 - width / 2;
    const top = box.y + box.height / 2 - height / 2;
    output += `<rect class="label-background" x="${round(left)}" y="${round(top)}" width="${round(width)}" height="${round(height)}"/>`;
    if (number) {
      output += `<circle class="badge" cx="${round(left + 6 + 8)}" cy="${round(top + height / 2)}" r="8"/>`;
      output += `<text class="badge-number" x="${round(left + 14)}" y="${round(top + height / 2 + 3.5)}" font-size="10" text-anchor="middle">${number}</text>`;
    }
    output += lines
      .map(
        (line, index) =>
          `<text class="label" x="${round(left + badge + 6 + (width - badge - 12) / 2)}" y="${round(
            top +
              3 +
              SMALL_FONT_SIZE * 0.95 +
              index * SMALL_FONT_SIZE * LINE_HEIGHT,
          )}" font-size="${SMALL_FONT_SIZE}" text-anchor="middle">${escape(line)}</text>`,
      )
      .join("");
  }
  return output + "</g>";
}

/** Text alternative of a view: one sentence for each relationship. */
function describe(view) {
  const titles = new Map(view.nodes.map((node) => [node.id, node.title]));
  return view.edges
    .map((edge, index) => {
      const source = titles.get(edge.source);
      const target = titles.get(edge.target);
      const label = edge.label?.replace(/\s*\n\s*/g, " ").trim();
      const step = view._type === "dynamic" ? `Step ${index + 1}: ` : "";
      const verb =
        edge.kind === "signs"
          ? "signs"
          : edge.kind === "returns"
            ? "returns to"
            : "depends on";
      return label
        ? `${step}${source} to ${target}: ${label}.`
        : `${step}${source} ${verb} ${target}.`;
    })
    .join(" ");
}

/**
 * A dynamic view as a sequence diagram. LikeC4 supplies the participants and
 * the steps in order. The geometry is simple, so this file computes it: the
 * gaps between participants follow the length of the labels.
 */
function renderSequence(view) {
  const id = `likec4-${view.id}`;
  const nodes = new Map(view.nodes.map((node) => [node.id, node]));
  const actors = [...view.sequenceLayout.actors]
    .sort((a, b) => a.x - b.x)
    .map((actor) => ({ ...actor, node: nodes.get(actor.id) }));
  const index = new Map(actors.map((actor, position) => [actor.id, position]));

  const boxWidth = 180;
  const boxHeight = 84;
  const labelWidth = 190;
  const labelLines = (edge) =>
    wrap(edge.label.replace(/\s*\n\s*/g, " "), labelWidth, SMALL_FONT_SIZE);

  // Distance between the lifelines of neighbours: wide enough for the labels
  // of the steps between them.
  const gaps = Array.from(
    { length: Math.max(0, actors.length - 1) },
    () => boxWidth + 20,
  );
  view.edges.forEach((edge) => {
    const from = index.get(edge.source);
    const to = index.get(edge.target);
    const low = Math.min(from, to);
    const high = Math.max(from, to);
    const width =
      Math.max(
        ...labelLines(edge).map(
          (line) => line.length * SMALL_FONT_SIZE * CHARACTER_WIDTH,
        ),
      ) + 44;
    for (let gap = low; gap < high; gap++) {
      gaps[gap] = Math.max(gaps[gap], width / (high - low));
    }
  });
  const centres = [boxWidth / 2];
  gaps.forEach((gap) => centres.push(centres[centres.length - 1] + gap));
  const width = centres[centres.length - 1] + boxWidth / 2;

  // Steps, top to bottom.
  let cursor = boxHeight + 28;
  const steps = view.edges.map((edge, position) => {
    const lines = labelLines(edge);
    const top = cursor;
    const arrowY = top + lines.length * SMALL_FONT_SIZE * LINE_HEIGHT + 10;
    cursor = arrowY + 26;
    return { edge, lines, top, arrowY, number: position + 1 };
  });
  const height = cursor;

  let output = "";
  actors.forEach((actor, position) => {
    const centre = centres[position];
    output += `<line class="lifeline" x1="${centre}" y1="${boxHeight}" x2="${centre}" y2="${height}"/>`;
    output += drawNode({
      ...actor.node,
      children: [],
      x: centre - boxWidth / 2,
      y: 0,
      width: boxWidth,
      height: boxHeight,
    });
  });
  const arrow = `${id}-arrow`;
  for (const step of steps) {
    const from = centres[index.get(step.edge.source)];
    const to = centres[index.get(step.edge.target)];
    const kind = step.edge.kind ?? "depends";
    const middle = (from + to) / 2;
    output += `<g class="edge ${kind} step"><path class="line" d="M${from} ${step.arrowY}L${to} ${step.arrowY}" marker-end="url(#${arrow})"/>`;
    output += `<circle class="badge" cx="${round(middle - (Math.max(...step.lines.map((line) => line.length)) * SMALL_FONT_SIZE * CHARACTER_WIDTH) / 2 - 22)}" cy="${round(step.top + 8)}" r="8"/>`;
    output += `<text class="badge-number" x="${round(middle - (Math.max(...step.lines.map((line) => line.length)) * SMALL_FONT_SIZE * CHARACTER_WIDTH) / 2 - 22)}" y="${round(step.top + 11.5)}" font-size="10" text-anchor="middle">${step.number}</text>`;
    output += textLines(
      step.lines,
      middle,
      step.top + 11,
      SMALL_FONT_SIZE,
      "label",
    );
    output += "</g>";
  }

  const pad = 12;
  return (
    `<svg class="likec4-svg sequence" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-description" ` +
    `viewBox="${-pad} ${-pad} ${round(width + 2 * pad)} ${round(height + 2 * pad)}" width="${round(width + 2 * pad)}" height="${round(height + 2 * pad)}" style="--diagram-width:${round(width + 2 * pad)}px">` +
    `<title id="${id}-title">${escape(view.title)}</title>` +
    `<desc id="${id}-description">${escape(describe(view))}</desc>` +
    `<defs><marker id="${arrow}" class="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10Z"/></marker></defs>` +
    output +
    `</svg>`
  );
}

/** The SVG of one layouted view. */
export function renderView(view) {
  if (view._type === "dynamic" && view.variant === "sequence") {
    return renderSequence(view);
  }
  const pad = 12;
  const { x, y, width, height } = view.bounds;
  const viewBox = [x - pad, y - pad, width + 2 * pad, height + 2 * pad].map(
    round,
  );
  const dynamic = view._type === "dynamic";
  const id = `likec4-${view.id}`;

  const nodes = [...view.nodes]
    .sort((a, b) => a.level - b.level)
    .map(drawNode)
    .join("");
  const edges = view.edges
    .map((edge, index) =>
      drawEdge(edge, dynamic ? index + 1 : null, `${id}-arrow`, view.routing),
    )
    .join("");

  return (
    `<svg class="likec4-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-title ${id}-description" ` +
    `viewBox="${viewBox.join(" ")}" width="${viewBox[2]}" height="${viewBox[3]}" style="--diagram-width:${viewBox[2]}px">` +
    `<title id="${id}-title">${escape(view.title)}</title>` +
    `<desc id="${id}-description">${escape(describe(view))}</desc>` +
    `<defs><marker id="${id}-arrow" class="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0 0L10 5L0 10Z"/></marker></defs>` +
    nodes +
    edges +
    `</svg>`
  );
}
