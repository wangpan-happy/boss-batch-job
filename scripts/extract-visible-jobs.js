(() => {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

  const textOf = (root, selectors) => {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const text = clean(node && node.textContent);
      if (text) return text;
    }
    return "";
  };

  const textsOf = (root, selectors) => {
    const out = [];
    for (const selector of selectors) {
      root.querySelectorAll(selector).forEach((node) => {
        const text = clean(node.textContent);
        if (text && !out.includes(text)) out.push(text);
      });
    }
    return out;
  };

  const findButton = (root) => {
    const candidates = Array.from(root.querySelectorAll("a, button, [role='button']"));
    return candidates.find((node) => /立即沟通|继续沟通|沟通/.test(clean(node.textContent)));
  };

  const findUrl = (root) => {
    const link = root.querySelector("a[href*='job_detail'], a[href*='/web/geek/job']");
    if (!link) return location.href;
    try {
      return new URL(link.getAttribute("href"), location.href).href;
    } catch {
      return location.href;
    }
  };

  const stripOnce = (text, value) => {
    const cleaned = clean(value);
    if (!cleaned) return text;
    return text.replace(cleaned, " ");
  };

  const inferCompany = (allText, record) => {
    let text = allText;
    [
      record.job_title,
      record.salary,
      record.location,
      record.experience,
      record.education
    ].forEach((value) => {
      text = stripOnce(text, value);
    });
    text = text
      .replace(/\b\d+\s*-\s*\d+年\b/g, " ")
      .replace(/\b\d+年以下\b/g, " ")
      .replace(/\d+\s*天\/周/g, " ")
      .replace(/\d+\s*个月/g, " ")
      .replace(/经验不限|应届|在校|学历不限|本科|大专|硕士|博士|中专|高中|初中|MBA|EMBA/g, " ");
    return clean(text);
  };

  const candidateSelectors = [
    ".card-area .job-card-wrap",
    ".job-card-wrapper",
    ".job-card-box",
    ".job-list-box li",
    ".search-job-result li",
    "[class*='job-card']",
    "[class*='JobCard']"
  ];

  const seen = new Set();
  const cards = [];

  for (const selector of candidateSelectors) {
    document.querySelectorAll(selector).forEach((node) => {
      if (seen.has(node)) return;
      const text = clean(node.innerText || node.textContent);
      if (!text) return;
      const looksLikeJob = /立即沟通|继续沟通|薪|K|经验|学历|公司|招聘/.test(text);
      if (!looksLikeJob) return;
      seen.add(node);
      cards.push(node);
    });
  }

  const records = cards.map((card, index) => {
    const tags = textsOf(card, [
      ".tag-list li",
      ".tag-list span",
      "[class*='tag'] li",
      "[class*='tag'] span"
    ]);
    const button = findButton(card);
    const allText = clean(card.innerText || card.textContent);
    const experience = tags.find((tag) => /经验|年|应届|在校|不限/.test(tag) && !/本科|大专|硕士|博士|学历/.test(tag)) || "";
    const education = tags.find((tag) => /本科|大专|硕士|博士|学历|中专|高中|初中|MBA|EMBA/.test(tag)) || "";

    const record = {
      index,
      job_title: textOf(card, [
        ".job-name",
        ".job-title .job-name",
        ".job-title",
        ".position-name",
        "[class*='job-name']",
        "[class*='jobName']"
      ]),
      company: textOf(card, [
        ".boss-name",
        ".company-name",
        ".company-info .company-name",
        ".company-info h3",
        "[class*='company-name']",
        "[class*='companyName']"
      ]),
      salary: textOf(card, [
        ".salary",
        ".job-salary",
        "[class*='salary']"
      ]),
      location: textOf(card, [
        ".company-location",
        ".job-area",
        ".job-location",
        ".job-address-desc",
        "[class*='area']",
        "[class*='location']"
      ]),
      experience,
      education,
      hr_or_recruiter: textOf(card, [
        ".boss-title",
        ".boss-info .boss-title",
        ".job-boss-info .boss-title",
        "[class*='boss-title']"
      ]),
      button_label: clean(button && button.textContent),
      source_url: findUrl(card),
      tags,
      raw_text: allText.slice(0, 1000)
    };

    if (!record.company) {
      record.company = inferCompany(allText, record);
    }

    return record;
  });

  return records.filter((record) => record.job_title || record.company || record.raw_text);
})();
