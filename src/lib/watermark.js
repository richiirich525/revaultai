import sharp from "sharp";

/*
  watermark — RevaultAI

  A visible mark on free output, and what provenance we can honestly claim.

  WHY IT IS COMPOSITED, NOT PROMPTED. The compiled prompt's negative block
  tells the model not to render text, logos or watermarks, and that is
  correct: text drawn by an image model is misshapen, inconsistent and
  sometimes gibberish, and a smeared wordmark looks worse than none. So the
  mark goes on afterwards, at a known size, in a known place.

  WHY IT MATTERS MORE HERE THAN IN MOST PRODUCTS. This draws real people's
  faces from their own photographs. A visible mark is the difference between
  an image that announces what it is and an image that could be passed off as
  a photograph of somebody doing something they did not do.

  ON C2PA. Real C2PA is a cryptographic signature from a certificate issued
  to the publisher, and this does not do that — saying it did would be worse
  than not doing it. What is written below is honest metadata: a statement in
  the file that it was generated, by what, and when. `provenance()` is the
  seam where a real signer goes, and it needs:

    - the c2pa-node library
    - a signing certificate and private key for RevaultAI LLC
    - those loaded from environment, never from the repo

  Until then, the visible mark is the real protection and the metadata is a
  courtesy that any tool can strip.
*/

/* The mark, as vector text so it stays crisp at whatever size the image is.
   Sized against the image rather than fixed, so a 1K avatar and a 4K still
   both get a mark that reads the same relative to the picture. */
function markSvg(width, height, label) {
  const pad = Math.max(10, Math.round(width * 0.022));
  const size = Math.max(11, Math.round(width * 0.030));
  const y = height - pad;
  /* A shadow under the text rather than a plate behind it: a plate hides
     part of the picture, and a shadow survives a light background. */
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - pad}" y="${y}" text-anchor="end"
        font-family="DM Mono, SFMono-Regular, Menlo, monospace" font-size="${size}"
        fill="#ffffff" fill-opacity="0.92"
        style="paint-order: stroke; stroke: #000000; stroke-opacity: 0.45; stroke-width: ${Math.max(2, size * 0.18)}px;"
      >${label}</text>
    </svg>`,
  );
}

/* What we can truthfully put in the file. Kept in one place so that adding a
   real signature later changes this function and nothing that calls it. */
export function provenance({ model, medium }) {
  return {
    /* IPTC is the field most tools actually read back, and the wording is
       the point: it says what this is, in words, to a human. */
    IPTC: {
      creator: "RevaultAI",
      credit: "Generated with RevaultAI",
      copyright: "Generated image. Not a photograph.",
      caption: [
        "AI-generated image.",
        medium ? `Medium: ${medium}.` : null,
        model ? `Model: ${model}.` : null,
        `Created: ${new Date().toISOString().slice(0, 10)}.`,
      ].filter(Boolean).join(" "),
    },
  };
}

/**
 * Stamp a still and attach what provenance we can.
 *
 * Returns the stamped buffer, or the original if stamping fails — a mark is
 * protection, and losing the whole image because the mark could not be drawn
 * would be the worse outcome. A failure is reported to the caller rather than
 * swallowed, so it can be logged.
 *
 * @param buffer   the image as it came back
 * @param label    the words to stamp, e.g. "revaultai.com"
 * @param meta     { model, medium } for the metadata
 * @returns { buffer, stamped, error }
 */
export async function stampStill(buffer, { label = "revaultai.com", model = null, medium = null } = {}) {
  try {
    const image = sharp(buffer, { failOn: "none" });
    const { width, height, format } = await image.metadata();
    if (!width || !height) return { buffer, stamped: false, error: "no dimensions" };

    const out = await sharp(buffer, { failOn: "none" })
      .composite([{ input: markSvg(width, height, label), top: 0, left: 0 }])
      .withMetadata(provenance({ model, medium }))
      .toFormat(format === "png" ? "png" : "jpeg", format === "png" ? {} : { quality: 90 })
      .toBuffer();

    return { buffer: out, stamped: true, error: null };
  } catch (err) {
    return { buffer, stamped: false, error: err.message };
  }
}
