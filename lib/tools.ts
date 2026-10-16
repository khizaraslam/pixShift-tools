export type ToolKind = "compress" | "resize" | "convert" | "aspect" | "social";
export type Format = "jpeg" | "png" | "webp";

export interface Preset {
  id: string;
  label: string;
  w: number;
  h: number;
}

export interface Faq {
  q: string;
  a: string;
}

export interface Tool {
  slug: string;
  name: string;
  icon: string;
  gradient: string;
  kind: ToolKind;
  /** Fixed output format. "same" keeps each file's own format. */
  output: Format | "same";
  /** Accepted input mime types for the dropzone. */
  accept: string;
  acceptLabel: string;
  presets?: Preset[];
  platform?: string;
  title: string;
  description: string;
  h1: string;
  quickAnswer: string;
  intro: string[];
  steps: string[];
  benefits: { title: string; text: string }[];
  faqs: Faq[];
  keywords: string[];
  related: string[];
}

const ANY_IMAGE = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif";

export const TOOLS: Tool[] = [
  {
    slug: "image-compressor",
    name: "Image Compressor",
    icon: "🗜️",
    gradient: "from-indigo-500 to-violet-500",
    kind: "compress",
    output: "same",
    accept: ANY_IMAGE,
    acceptLabel: "JPG, PNG, WebP, GIF, BMP, AVIF",
    title: "Image Compressor – Reduce Image Size Online Free | PixShift",
    description:
      "Compress JPG, PNG and WebP images online for free. Reduce file size while keeping quality. Runs in your browser, no upload, no signup.",
    h1: "Free Image Compressor",
    quickAnswer:
      "To compress an image online, drop it into PixShift, choose a quality level (around 70–80% is a good balance), and download the smaller file. Compression happens inside your browser, so the image is never uploaded.",
    intro: [
      "Large photos slow down websites, fill up email attachments and eat storage. PixShift's image compressor reduces file size by re-encoding your picture with a smarter quality setting, and you can see the result before you download it.",
      "It supports JPG, PNG and WebP, handles many files at once and lets you download everything as a single ZIP. Because the work happens on your device, it is fast and private.",
    ],
    steps: [
      "Drop one or more images into the box or click to browse.",
      "Move the quality slider. Lower values give smaller files.",
      "Compare the before and after size, then download each image or the full ZIP.",
    ],
    benefits: [
      { title: "Private by design", text: "Images stay on your device. Nothing is sent to a server." },
      { title: "Batch ready", text: "Compress many images in one go and save them as a ZIP." },
      { title: "Format aware", text: "JPG and WebP use quality encoding; PNG uses colour quantization." },
      { title: "No signup", text: "No account, no watermark and no daily limits." },
    ],
    faqs: [
      {
        q: "How much can an image be compressed?",
        a: "It depends on the image. Photos often shrink a lot at 70–80% quality with little visible change, while already optimized or very small images shrink less.",
      },
      {
        q: "Does compressing reduce image quality?",
        a: "JPG and WebP compression is lossy, so some detail is discarded. At moderate settings the difference is hard to notice. Use the preview and pick the lowest size that still looks good to you.",
      },
      {
        q: "Which format is best for the web?",
        a: "WebP usually gives smaller files than JPG or PNG at similar visual quality and is supported by all modern browsers. Use the WebP Converter if you want to switch.",
      },
    ],
    keywords: [
      "image compressor",
      "compress image online",
      "reduce image size",
      "compress photo without losing quality",
      "bulk image compressor",
    ],
    related: ["jpg-compressor", "png-compressor", "webp-converter", "image-resizer"],
  },
  {
    slug: "image-resizer",
    name: "Image Resizer",
    icon: "📐",
    gradient: "from-sky-500 to-indigo-500",
    kind: "resize",
    output: "same",
    accept: ANY_IMAGE,
    acceptLabel: "JPG, PNG, WebP, GIF, BMP, AVIF",
    title: "Image Resizer – Resize Photos by Pixels or Percent | PixShift",
    description:
      "Resize images to exact width and height or by percentage. Keep aspect ratio, batch resize and download instantly. Free and private.",
    h1: "Free Image Resizer",
    quickAnswer:
      "To resize an image, upload it to PixShift, enter a new width or height (or a percentage), keep the aspect ratio lock on, and download the result. Everything runs locally in your browser.",
    intro: [
      "Need a photo at exactly 800 pixels wide, or half its current size? The image resizer changes dimensions precisely and can lock the aspect ratio so nothing looks stretched.",
      "Choose a custom size or a percentage, set the output quality, and resize a whole batch of pictures at once.",
    ],
    steps: [
      "Add your images.",
      "Pick pixels or percent, then type the new width or height.",
      "Download the resized images individually or as a ZIP.",
    ],
    benefits: [
      { title: "Exact dimensions", text: "Set width and height in pixels or scale by percentage." },
      { title: "Aspect ratio lock", text: "Avoid stretched or squashed photos automatically." },
      { title: "Batch resizing", text: "Apply the same size to every image you add." },
      { title: "High-quality scaling", text: "Smooth resampling keeps edges clean." },
    ],
    faqs: [
      {
        q: "How do I resize an image without losing quality?",
        a: "Making an image smaller keeps it sharp. Making it larger cannot add real detail, so enlarge only slightly. Keep the aspect ratio locked to avoid distortion.",
      },
      {
        q: "What is the difference between resizing and compressing?",
        a: "Resizing changes the pixel dimensions. Compressing changes how the pixels are stored to reduce file size. Smaller dimensions also reduce file size.",
      },
      {
        q: "Can I resize many images at once?",
        a: "Yes. Add several files and the same settings are applied to each one, then download them as a ZIP.",
      },
    ],
    keywords: [
      "image resizer",
      "resize image online",
      "resize photo to pixels",
      "change image dimensions",
      "bulk image resizer",
    ],
    related: ["image-compressor", "aspect-ratio-calculator", "instagram-image-resizer", "linkedin-image-resizer"],
  },
  {
    slug: "jpg-compressor",
    name: "JPG Compressor",
    icon: "📷",
    gradient: "from-amber-500 to-orange-500",
    kind: "compress",
    output: "jpeg",
    accept: "image/jpeg",
    acceptLabel: "JPG / JPEG",
    title: "JPG Compressor – Compress JPEG Images Online | PixShift",
    description:
      "Compress JPG and JPEG photos online for free. Shrink file size with an adjustable quality slider. Private, fast, no signup.",
    h1: "Free JPG Compressor",
    quickAnswer:
      "To compress a JPG, add it to PixShift, set quality to roughly 70–80%, and download the smaller JPEG. JPG quality can be reduced a lot before differences become obvious.",
    intro: [
      "JPG is the most common photo format, and it is also easy to shrink. The JPG compressor re-encodes your photo at a quality you choose, so you can find the point where the file is small and still looks good.",
      "Use it before uploading to a website, sending by email or filling a form that limits file size.",
    ],
    steps: [
      "Select your JPG or JPEG files.",
      "Adjust the quality slider and watch the file size change.",
      "Download the compressed JPGs.",
    ],
    benefits: [
      { title: "Made for photos", text: "Quality slider tuned for typical camera and phone pictures." },
      { title: "Meets upload limits", text: "Shrink to fit email, job portals and form size caps." },
      { title: "Local processing", text: "Your photos never leave your device." },
      { title: "Fast", text: "Compression runs instantly in the browser." },
    ],
    faqs: [
      {
        q: "What is a good JPG quality setting?",
        a: "For most photos, 70–85% balances size and appearance. Go lower for thumbnails and higher for prints or detailed images.",
      },
      {
        q: "Is JPG the same as JPEG?",
        a: "Yes. JPG and JPEG are the same format; the shorter extension exists because older systems limited extensions to three letters.",
      },
      {
        q: "Can I compress a JPG to a specific size like 100 KB?",
        a: "Lower the quality slider step by step until the size shown is under your target. If it is still too large, resize the image to smaller dimensions first.",
      },
    ],
    keywords: ["jpg compressor", "compress jpeg", "reduce jpg size", "jpg to 100kb", "compress jpg online"],
    related: ["image-compressor", "image-resizer", "png-to-jpg", "webp-converter"],
  },
  {
    slug: "png-compressor",
    name: "PNG Compressor",
    icon: "🧩",
    gradient: "from-emerald-500 to-teal-500",
    kind: "compress",
    output: "png",
    accept: "image/png",
    acceptLabel: "PNG",
    title: "PNG Compressor – Reduce PNG File Size Online | PixShift",
    description:
      "Compress PNG images online while keeping transparency. Smaller PNG files through colour quantization. Free, private and instant.",
    h1: "Free PNG Compressor",
    quickAnswer:
      "To compress a PNG, upload it to PixShift and lower the quality slider. The tool reduces the number of colours (quantization) to make the file smaller while keeping transparency.",
    intro: [
      "PNG files are lossless and often large. The PNG compressor shrinks them by reducing the colour palette, which works especially well for logos, icons, screenshots and illustrations.",
      "Transparency is preserved, so your cut-outs and logos still sit cleanly on any background.",
    ],
    steps: [
      "Add your PNG files.",
      "Lower the quality slider to reduce colours and file size.",
      "Download the compressed PNGs.",
    ],
    benefits: [
      { title: "Keeps transparency", text: "Alpha channels stay intact for logos and cut-outs." },
      { title: "Great for graphics", text: "Screenshots, icons and flat artwork shrink well." },
      { title: "Adjustable", text: "Choose how many colours to keep." },
      { title: "Private", text: "No upload to any server." },
    ],
    faqs: [
      {
        q: "Why are PNG files so large?",
        a: "PNG stores images losslessly, which preserves every pixel but produces bigger files than JPG for photographs.",
      },
      {
        q: "Does PNG compression keep transparency?",
        a: "Yes. The compressor keeps the alpha channel so transparent areas stay transparent.",
      },
      {
        q: "Should I use PNG or WebP?",
        a: "WebP supports transparency and is usually smaller than PNG. If your site supports it, converting PNG to WebP is a strong option.",
      },
    ],
    keywords: ["png compressor", "compress png", "reduce png size", "png optimizer", "compress png transparent"],
    related: ["image-compressor", "webp-converter", "png-to-jpg", "image-resizer"],
  },
  {
    slug: "webp-converter",
    name: "WebP Converter",
    icon: "⚡",
    gradient: "from-fuchsia-500 to-pink-500",
    kind: "convert",
    output: "webp",
    accept: ANY_IMAGE,
    acceptLabel: "JPG, PNG, GIF, BMP, AVIF",
    title: "WebP Converter – Convert JPG & PNG to WebP Online | PixShift",
    description:
      "Convert JPG, PNG and other images to WebP online for free. Smaller files, faster websites. No upload and no signup.",
    h1: "Free WebP Converter",
    quickAnswer:
      "To convert an image to WebP, drop your JPG or PNG into PixShift, pick a quality level, and download the .webp file. WebP files are usually smaller than JPG or PNG at similar quality.",
    intro: [
      "WebP is a modern image format designed for the web. It supports both photos and transparency, and typically produces smaller files than JPG or PNG, which helps pages load faster.",
      "Convert single images or whole batches in seconds, with an adjustable quality slider.",
    ],
    steps: [
      "Add JPG, PNG or other images.",
      "Choose the WebP quality.",
      "Download the .webp files or a ZIP.",
    ],
    benefits: [
      { title: "Faster pages", text: "Smaller images improve loading speed and Core Web Vitals." },
      { title: "Transparency support", text: "Convert PNG logos without losing the alpha channel." },
      { title: "Batch conversion", text: "Convert many files and download them together." },
      { title: "Private", text: "Conversion happens locally in your browser." },
    ],
    faqs: [
      {
        q: "What is WebP?",
        a: "WebP is an image format developed by Google that supports lossy and lossless compression, transparency and animation, built for smaller files on the web.",
      },
      {
        q: "Do all browsers support WebP?",
        a: "All current major browsers support WebP. Some older software and apps may not open it, in which case you can convert back to JPG or PNG.",
      },
      {
        q: "Is WebP better than JPG?",
        a: "For web use it is usually smaller at similar quality. JPG remains the safest choice for maximum compatibility with older tools.",
      },
    ],
    keywords: ["webp converter", "convert to webp", "jpg to webp", "png to webp", "image to webp online"],
    related: ["image-compressor", "png-compressor", "jpg-to-png", "png-to-jpg"],
  },
  {
    slug: "jpg-to-png",
    name: "JPG to PNG",
    icon: "🔁",
    gradient: "from-cyan-500 to-blue-500",
    kind: "convert",
    output: "png",
    accept: "image/jpeg",
    acceptLabel: "JPG / JPEG",
    title: "JPG to PNG Converter – Convert JPEG to PNG Free | PixShift",
    description:
      "Convert JPG to PNG online in one click. Lossless PNG output, batch conversion, no upload and no signup.",
    h1: "JPG to PNG Converter",
    quickAnswer:
      "To convert JPG to PNG, add your JPG file to PixShift and download the PNG. The PNG is lossless from the point of conversion, but it cannot restore detail already lost in the JPG.",
    intro: [
      "Sometimes you need PNG: for editing without further quality loss, for graphics workflows, or because a platform requires it. This converter turns JPG and JPEG files into PNG instantly.",
      "Note that converting to PNG does not add transparency or recover detail, and the PNG will usually be larger than the original JPG.",
    ],
    steps: ["Add your JPG files.", "Click convert (it runs automatically).", "Download the PNG files."],
    benefits: [
      { title: "Lossless output", text: "No further quality loss after conversion." },
      { title: "Editing friendly", text: "Good starting point for repeated edits." },
      { title: "Batch support", text: "Convert many JPGs at once." },
      { title: "Private", text: "Nothing leaves your device." },
    ],
    faqs: [
      {
        q: "Does converting JPG to PNG improve quality?",
        a: "No. It stops further loss from re-saving, but it cannot bring back detail that JPG compression already removed.",
      },
      {
        q: "Why is the PNG bigger than my JPG?",
        a: "PNG stores pixels losslessly, which takes more space than JPG for photographs.",
      },
      {
        q: "Will the PNG have a transparent background?",
        a: "No. JPG has no transparency, so the PNG will keep the same opaque background.",
      },
    ],
    keywords: ["jpg to png", "convert jpg to png", "jpeg to png", "jpg to png online free"],
    related: ["png-to-jpg", "webp-converter", "image-compressor", "png-compressor"],
  },
  {
    slug: "png-to-jpg",
    name: "PNG to JPG",
    icon: "🖼️",
    gradient: "from-rose-500 to-red-500",
    kind: "convert",
    output: "jpeg",
    accept: "image/png",
    acceptLabel: "PNG",
    title: "PNG to JPG Converter – Convert PNG to JPEG Free | PixShift",
    description:
      "Convert PNG to JPG online and cut file size. Choose quality, batch convert, transparent areas become white. Free and private.",
    h1: "PNG to JPG Converter",
    quickAnswer:
      "To convert PNG to JPG, upload the PNG to PixShift, choose quality, and download the JPG. Transparent areas are filled with white because JPG does not support transparency.",
    intro: [
      "PNG files can be very large. Converting them to JPG usually makes them much smaller, which is ideal for photos, email and uploads with size limits.",
      "Because JPG has no transparency, any see-through areas are filled with a solid background colour.",
    ],
    steps: ["Add your PNG files.", "Set the JPG quality.", "Download the JPG files or a ZIP."],
    benefits: [
      { title: "Smaller files", text: "Photos in JPG are typically far smaller than PNG." },
      { title: "Wide compatibility", text: "JPG opens almost everywhere." },
      { title: "White background fill", text: "Transparent areas become clean white." },
      { title: "Batch support", text: "Convert many PNGs at once." },
    ],
    faqs: [
      {
        q: "What happens to transparency when converting PNG to JPG?",
        a: "JPG cannot store transparency, so transparent pixels are replaced with white.",
      },
      {
        q: "Will I lose quality?",
        a: "JPG is lossy, so there is a small quality change. At high quality settings it is rarely noticeable for photos.",
      },
      {
        q: "When should I keep PNG instead?",
        a: "Keep PNG for logos, icons, screenshots with sharp text and anything needing transparency.",
      },
    ],
    keywords: ["png to jpg", "convert png to jpg", "png to jpeg", "png to jpg online free"],
    related: ["jpg-to-png", "jpg-compressor", "webp-converter", "image-compressor"],
  },
  {
    slug: "aspect-ratio-calculator",
    name: "Aspect Ratio Calculator",
    icon: "🧮",
    gradient: "from-violet-500 to-purple-500",
    kind: "aspect",
    output: "same",
    accept: "",
    acceptLabel: "",
    title: "Aspect Ratio Calculator – Find Ratio & Resize Dimensions | PixShift",
    description:
      "Calculate aspect ratio from width and height, or find the missing dimension when resizing. Includes common ratios like 16:9, 4:3 and 1:1.",
    h1: "Aspect Ratio Calculator",
    quickAnswer:
      "To find an aspect ratio, divide width and height by their greatest common divisor. For example 1920×1080 simplifies to 16:9. To resize, multiply the new width by height ÷ width to get the matching height.",
    intro: [
      "Aspect ratio is the proportional relationship between an image's width and height. Keeping it the same when resizing prevents stretching.",
      "Type in a width and height to see the simplified ratio, then enter a new width or height to get the matching dimension.",
    ],
    steps: [
      "Enter your original width and height.",
      "Read the simplified ratio and decimal value.",
      "Enter a new width or height to calculate the other side.",
    ],
    benefits: [
      { title: "Instant results", text: "Updates as you type." },
      { title: "Two-way scaling", text: "Solve for new width or new height." },
      { title: "Common presets", text: "One click for 16:9, 4:3, 1:1, 9:16 and more." },
      { title: "No upload needed", text: "Pure calculation in the browser." },
    ],
    faqs: [
      {
        q: "What is aspect ratio?",
        a: "It is the ratio of an image's width to its height, written like 16:9. Two images with the same ratio have the same shape even if their sizes differ.",
      },
      {
        q: "How do I calculate aspect ratio?",
        a: "Divide both width and height by their greatest common divisor. For 1200×800 the divisor is 400, giving 3:2.",
      },
      {
        q: "What is the aspect ratio of 1920×1080?",
        a: "1920×1080 is 16:9, the standard widescreen ratio for HD and Full HD video.",
      },
    ],
    keywords: [
      "aspect ratio calculator",
      "image aspect ratio",
      "calculate aspect ratio",
      "16:9 calculator",
      "resize keep aspect ratio",
    ],
    related: ["image-resizer", "instagram-image-resizer", "linkedin-image-resizer", "image-compressor"],
  },
  {
    slug: "instagram-image-resizer",
    name: "Instagram Image Resizer",
    icon: "📸",
    gradient: "from-pink-500 via-rose-500 to-orange-400",
    kind: "social",
    output: "jpeg",
    platform: "Instagram",
    accept: ANY_IMAGE,
    acceptLabel: "JPG, PNG, WebP and more",
    presets: [
      { id: "square", label: "Square post (1:1) – 1080×1080", w: 1080, h: 1080 },
      { id: "portrait", label: "Portrait post (4:5) – 1080×1350", w: 1080, h: 1350 },
      { id: "grid", label: "Grid portrait (3:4) – 1080×1440", w: 1080, h: 1440 },
      { id: "landscape", label: "Landscape post (1.91:1) – 1080×566", w: 1080, h: 566 },
      { id: "story", label: "Story / Reel (9:16) – 1080×1920", w: 1080, h: 1920 },
      { id: "profile", label: "Profile photo – 320×320", w: 320, h: 320 },
    ],
    title: "Instagram Image Resizer – Post, Story & Reel Sizes | PixShift",
    description:
      "Resize photos for Instagram posts, stories, reels and profile pictures. Fit or fill, with background colour. Free, private, no signup.",
    h1: "Instagram Image Resizer",
    quickAnswer:
      "The most common Instagram sizes are 1080×1080 for square posts, 1080×1350 for portrait posts and 1080×1920 for Stories and Reels. Pick a preset in PixShift, choose fit or fill, and download.",
    intro: [
      "Instagram crops anything that does not match its supported shapes. Resize your photo to the right dimensions first so you control exactly what stays in the frame.",
      "Choose a preset, then decide whether to fill the frame (cropping edges) or fit the whole image inside with a background colour.",
    ],
    steps: [
      "Add your photo.",
      "Pick an Instagram preset: post, portrait, story or profile.",
      "Choose Fill or Fit, then download the ready-to-post image.",
    ],
    benefits: [
      { title: "Latest sizes", text: "Presets for square, portrait, grid, landscape, story and profile." },
      { title: "Fit or fill", text: "Crop to fill or add a background colour to keep everything visible." },
      { title: "Sharp output", text: "Exports at full recommended pixel size." },
      { title: "Private", text: "Photos never leave your device." },
    ],
    faqs: [
      {
        q: "What size should an Instagram post be?",
        a: "Square posts use 1080×1080. Portrait 4:5 posts use 1080×1350, and the newer 3:4 grid portrait uses 1080×1440. Landscape posts use 1080×566.",
      },
      {
        q: "What is the Instagram Story size?",
        a: "Stories and Reels use a 9:16 vertical frame, recommended at 1080×1920 pixels.",
      },
      {
        q: "Will Instagram compress my image?",
        a: "Yes, Instagram re-compresses uploads. Starting at the recommended pixel size helps keep results sharp. Platform specs change, so check Instagram's current guidance if in doubt.",
      },
    ],
    keywords: [
      "instagram image resizer",
      "resize image for instagram",
      "instagram photo size",
      "instagram story size",
      "instagram post size 2026",
    ],
    related: ["linkedin-image-resizer", "image-resizer", "aspect-ratio-calculator", "image-compressor"],
  },
  {
    slug: "linkedin-image-resizer",
    name: "LinkedIn Image Resizer",
    icon: "💼",
    gradient: "from-blue-600 to-sky-500",
    kind: "social",
    output: "jpeg",
    platform: "LinkedIn",
    accept: ANY_IMAGE,
    acceptLabel: "JPG, PNG, WebP and more",
    presets: [
      { id: "post", label: "Shared link / post image – 1200×627", w: 1200, h: 627 },
      { id: "square", label: "Square post – 1200×1200", w: 1200, h: 1200 },
      { id: "profile", label: "Profile photo – 400×400", w: 400, h: 400 },
      { id: "banner", label: "Personal banner – 1584×396", w: 1584, h: 396 },
      { id: "company-cover", label: "Company cover – 1128×191", w: 1128, h: 191 },
      { id: "logo", label: "Company logo – 300×300", w: 300, h: 300 },
      { id: "article", label: "Article cover – 1280×720", w: 1280, h: 720 },
    ],
    title: "LinkedIn Image Resizer – Banner, Post & Profile Sizes | PixShift",
    description:
      "Resize images for LinkedIn banners, posts, profile photos and company covers. Fit or fill, free and private. No signup.",
    h1: "LinkedIn Image Resizer",
    quickAnswer:
      "Common LinkedIn sizes are 1200×627 for post and link images, 400×400 for profile photos and 1584×396 for personal banners. Choose a preset in PixShift and download the resized image.",
    intro: [
      "A well-sized banner and profile photo make a professional first impression. LinkedIn crops and scales images, so uploading the right dimensions keeps faces and text from being cut off.",
      "Pick the placement you need, choose fill or fit, and export an image ready to upload.",
    ],
    steps: [
      "Add your image.",
      "Select a LinkedIn preset: banner, post, profile, company cover and more.",
      "Choose Fill or Fit and download.",
    ],
    benefits: [
      { title: "Every placement", text: "Profile, banner, post, article and company page sizes." },
      { title: "Fit or fill", text: "Keep the whole image or crop to the frame." },
      { title: "Professional output", text: "High-quality export at the recommended size." },
      { title: "Private", text: "Your images stay on your device." },
    ],
    faqs: [
      {
        q: "What size is a LinkedIn banner?",
        a: "The personal profile banner is recommended at 1584×396 pixels. Company page covers are narrower at 1128×191.",
      },
      {
        q: "What is the best LinkedIn post image size?",
        a: "1200×627 works well for shared link and landscape images, and 1200×1200 works for square posts.",
      },
      {
        q: "What size should my LinkedIn profile photo be?",
        a: "400×400 pixels is the recommended minimum for a square profile photo. LinkedIn displays it in a circle, so keep your face centred.",
      },
    ],
    keywords: [
      "linkedin image resizer",
      "linkedin banner size",
      "resize image for linkedin",
      "linkedin profile photo size",
      "linkedin post image size",
    ],
    related: ["instagram-image-resizer", "image-resizer", "aspect-ratio-calculator", "jpg-compressor"],
  },
];

export const TOOL_MAP: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

export function getTool(slug: string) {
  return TOOL_MAP[slug];
}

export const SITE_FAQS: Faq[] = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. PixShift processes images locally in your browser using your device. Your files are not uploaded or stored.",
  },
  {
    q: "Is PixShift free?",
    a: "Yes. All tools are free to use with no signup, watermark or daily limit.",
  },
  {
    q: "Which image formats are supported?",
    a: "JPG/JPEG, PNG, WebP, GIF, BMP and AVIF can be opened (depending on your browser). Output formats are JPG, PNG and WebP.",
  },
];
