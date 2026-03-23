export async function getDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      
      canvas.width = 10;
      canvas.height = 10;
      ctx.drawImage(img, 0, 0, 10, 10);
      
      const imageData = ctx.getImageData(0, 0, 10, 10).data;
      let r = 0, g = 0, b = 0;
      
      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
      }
      
      const count = imageData.length / 4;
      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);
      
      // Ensure the color is not too dark or too light for UI
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 50) {
        // Too dark, lighten it
        r = Math.min(255, r + 50);
        g = Math.min(255, g + 50);
        b = Math.min(255, b + 50);
      } else if (brightness > 200) {
        // Too light, darken it
        r = Math.max(0, r - 50);
        g = Math.max(0, g - 50);
        b = Math.max(0, b - 50);
      }
      
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    
    img.onerror = () => {
      resolve(null);
    };
  });
}
