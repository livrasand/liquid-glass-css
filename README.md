# liquid-glass-css
Apple's Liquid Glass effect for CSS

For best results, I recommend using [Tailwind CSS](https://tailwindcss.com/) and [macOS Tailwind](https://macos-tailwind.netlify.app/?path=/docs/macos-tailwind--docs) for your website designs. You can implement [Liquid Glass CSS](https://github.com/livrasand/liquid-glass-css) simply paste through the GitHub CDN, or you can use [jsDelivr](https://www.jsdelivr.com/):

```html
https://raw.githubusercontent.com/livrasand/liquid-glass-css/refs/heads/main/liquid-glass.js
```

### Usage
Add to any element:

```html
<div class="liquid-glass">Hover me</div>
```

With macOS Tailwind:

```html
<button class="liquid-glass rounded py-0.5 px-2 text-sm shadow-md active:bg-gray-50">
  Secondary
</button>
```

This is an experimental project for now; depending on the impact on users, improvements will be made and an npm package will be created. and/or I will create my own [macOS Tailwind](https://macos-tailwind.netlify.app/?path=/docs/macos-tailwind--docs) inspired by the new [macOS Tahoe 26](https://www.apple.com/os/macos/) for greater compatibility with this script.
