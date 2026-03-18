export function normalizeAIContent(content: string): string {
  if (!content) return content;

  let normalized = content;
  const superscriptMap: Record<string, string> = {
    "0": "\u2070",
    "1": "\u00b9",
    "2": "\u00b2",
    "3": "\u00b3",
    "4": "\u2074",
    "5": "\u2075",
    "6": "\u2076",
    "7": "\u2077",
    "8": "\u2078",
    "9": "\u2079",
    "+": "\u207a",
    "-": "\u207b",
  };
  const subscriptMap: Record<string, string> = {
    "0": "\u2080",
    "1": "\u2081",
    "2": "\u2082",
    "3": "\u2083",
    "4": "\u2084",
    "5": "\u2085",
    "6": "\u2086",
    "7": "\u2087",
    "8": "\u2088",
    "9": "\u2089",
    "+": "\u208a",
    "-": "\u208b",
  };
  const allowedSuperscriptText = /^[0-9+\-=().]+$/;
  const allowedSubscriptDigits = /^[0-9+\-]+$/;

  const toSuperscript = (value: string) => {
    const compact = value.replace(/\s+/g, "");
    if (!allowedSuperscriptText.test(compact)) {
      return `^(${value.trim()})`;
    }

    return compact
      .split("")
      .map((char) => superscriptMap[char] || char)
      .join("");
  };

  const toSubscript = (value: string) => {
    const compact = value.replace(/\s+/g, "");
    if (!allowedSubscriptDigits.test(compact)) {
      return `(${value.trim()})`;
    }

    return compact
      .split("")
      .map((char) => subscriptMap[char] || char)
      .join("");
  };

  const replacements: Array<[RegExp, string]> = [
    [/\\\(/g, ""],
    [/\\\)/g, ""],
    [/\\\[/g, ""],
    [/\\\]/g, ""],
    [/\\times/g, "\u00d7"],
    [/\\cdot/g, "\u00b7"],
    [/\\rightarrow/g, "\u2192"],
    [/\\Rightarrow/g, "\u21d2"],
    [/\\pm/g, "\u00b1"],
    [/\\neq/g, "\u2260"],
    [/\\leq/g, "\u2264"],
    [/\\geq/g, "\u2265"],
    [/\\alpha/g, "\u03b1"],
    [/\\beta/g, "\u03b2"],
    [/\\gamma/g, "\u03b3"],
    [/\\Delta/g, "\u0394"],
    [/\\pi/g, "\u03c0"],
    [/\\approx/g, "\u2248"],
    [/\\leftrightarrow/g, "\u2194"],
    [/\\rightarrow/g, "\u2192"],
    [/\\leftarrow/g, "\u2190"],
    [/\\infty/g, "\u221e"],
    [/\\degree/g, "\u00b0"],
    [/\\circ/g, "\u00b0"],
    [/\\left/g, ""],
    [/\\right/g, ""],
    [/\\\\/g, "\n"],
    [/<br\s*\/?>/gi, "\n"],
    [/&nbsp;/g, " "],
  ];

  for (const [pattern, value] of replacements) {
    normalized = normalized.replace(pattern, value);
  }

  normalized = normalized.replace(/\\text\{([^}]*)\}/g, "$1");
  normalized = normalized.replace(/\\mathrm\{([^}]*)\}/g, "$1");
  normalized = normalized.replace(/\\operatorname\{([^}]*)\}/g, "$1");
  normalized = normalized.replace(/\\textbf\{([^}]*)\}/g, "**$1**");
  normalized = normalized.replace(/\\textit\{([^}]*)\}/g, "*$1*");
  normalized = normalized.replace(/\\overrightarrow\{([^}]*)\}/g, "$1");
  normalized = normalized.replace(/\\vec\{([^}]*)\}/g, "$1");
  normalized = normalized.replace(/\\sqrt\{([^}]*)\}/g, "\u221a($1)");
  normalized = normalized.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)");
  normalized = normalized.replace(/<sup>(.*?)<\/sup>/gi, (_match, value) => toSuperscript(String(value)));
  normalized = normalized.replace(/<sub>(.*?)<\/sub>/gi, (_match, value) => toSubscript(String(value)));
  normalized = normalized.replace(/([A-Za-z0-9)\]])\^\{([^}]+)\}/g, (_match, base, exponent) => {
    return `${base}${toSuperscript(String(exponent))}`;
  });
  normalized = normalized.replace(/([A-Za-z0-9)\]])_\{([^}]+)\}/g, (_match, base, subscript) => {
    return `${base}${toSubscript(String(subscript))}`;
  });
  normalized = normalized.replace(/([A-Za-z0-9)\]])\^([0-9+\-=().]+)/g, (_match, base, exponent) => {
    return `${base}${toSuperscript(String(exponent))}`;
  });
  normalized = normalized.replace(/([A-Za-z\)])_([0-9+\-]+)/g, (_match, base, subscript) => {
    return `${base}${toSubscript(String(subscript))}`;
  });
  normalized = normalized.replace(/([A-Za-z])_([A-Za-z][A-Za-z0-9-]*)/g, (_match, base, subscript) => {
    return `${base}(${String(subscript).trim()})`;
  });
  normalized = normalized.replace(/->/g, "\u2192");
  normalized = normalized.replace(/<->/g, "\u2194");
  normalized = normalized.replace(/=>/g, "\u21d2");
  normalized = normalized.replace(/\b(delta|theta|lambda|mu|sigma|omega)\b/gi, (match) => {
    const greekMap: Record<string, string> = {
      delta: "\u03b4",
      theta: "\u03b8",
      lambda: "\u03bb",
      mu: "\u03bc",
      sigma: "\u03c3",
      omega: "\u03c9",
    };
    return greekMap[match.toLowerCase()] || match;
  });

  normalized = normalized.replace(/\n{3,}/g, "\n\n");
  return normalized.trim();
}
