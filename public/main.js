// --- COMPATIBILITY CHECK ---
(function () {
    const isCompatible = () => window.FileReader && document.createElement('canvas').getContext && 'download' in document.createElement('a') && window.JSZip;
    if (!isCompatible()) {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('compatibility-warning').style.display = 'block';
        return;
    }

    // --- APPLICATION LOGIC ---
    document.addEventListener('DOMContentLoaded', () => {
        // --- Element References ---
        const dropZone = document.getElementById('drop-zone');
        const imageInput = document.getElementById('image-input');
        const mainContent = document.getElementById('main-content');
        const imagePreview = document.getElementById('image-preview');
        const previewInfo = document.getElementById('preview-info');
        const resetBtn = document.getElementById('reset-btn');
        const loader = document.getElementById('loader');
        const outputDiv = document.getElementById('output');

        // --- Buttons ---
        const toJpgBtn = document.getElementById('to-jpg-btn');
        const toPngBtn = document.getElementById('to-png-btn');
        const toWebpBtn = document.getElementById('to-webp-btn');
        const toIcoBtn = document.getElementById('to-ico-btn');
        const toSplashBtn = document.getElementById('to-splash-btn');
        const toAppIconsBtn = document.getElementById('to-app-icons-btn');
        const toDocPhotoBtn = document.getElementById('to-doc-photo-btn');

        // --- State ---
        let uploadedImage = null;
        let imageName = '';

        // --- Event Listeners ---
        dropZone.addEventListener('click', () => imageInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        });
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFile(file);
        });
        resetBtn.addEventListener('click', resetApp);

        // --- Button Actions ---
        toJpgBtn.addEventListener('click', () => {
            const quality = document.getElementById('jpg-quality').value / 100;
            convertImage('jpeg', quality);
        });
        toWebpBtn.addEventListener('click', () => {
            const quality = document.getElementById('webp-quality').value / 100;
            convertImage('webp', quality);
        });
        toPngBtn.addEventListener('click', () => convertImage('png'));
        toIcoBtn.addEventListener('click', generateIco);
        toSplashBtn.addEventListener('click', generateSplashScreens);
        toAppIconsBtn.addEventListener('click', generateAppIcons);
        toDocPhotoBtn.addEventListener('click', generateDocumentPhotos);

        // --- Core Functions ---
        function handleFile(file) {
            if (!file.type.startsWith('image/')) return;
            imageName = file.name.split('.')[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedImage = new Image();
                uploadedImage.onload = () => {
                    dropZone.style.display = 'none';
                    mainContent.style.display = 'grid';
                    imagePreview.src = event.target.result;
                    previewInfo.textContent = `${uploadedImage.width} x ${uploadedImage.height}px`;
                    outputDiv.innerHTML = '';
                };
                uploadedImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }

        function resetApp() {
            uploadedImage = null;
            imageName = '';
            imageInput.value = '';
            dropZone.style.display = 'block';
            mainContent.style.display = 'none';
            imagePreview.src = '';
            previewInfo.textContent = '';
            outputDiv.innerHTML = '';
        }

        function showLoader() { loader.classList.add('active'); }
        function hideLoader() { loader.classList.remove('active'); }

        async function convertImage(format, quality = 1) {
            if (!uploadedImage) return;
            showLoader();

            setTimeout(() => {
                const canvas = document.createElement('canvas');
                canvas.width = uploadedImage.width;
                canvas.height = uploadedImage.height;
                const ctx = canvas.getContext('2d');
                if (format === 'jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                ctx.drawImage(uploadedImage, 0, 0);

                const dataUrl = canvas.toDataURL(`image/${format}`, quality);
                autoDownload(dataUrl, `${imageName}.${format}`);
                displayPreview(dataUrl);
                hideLoader();
            }, 50);
        }

        function getDominantColor(img) {
            const canvas = document.createElement('canvas');
            const scale = Math.min(1, 100 / img.width);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const colorCount = {};
            let maxCount = 0;
            let dominantColor = 'rgb(255, 255, 255)';
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;
                const rgb = `rgb(${r},${g},${b})`;
                colorCount[rgb] = (colorCount[rgb] || 0) + 1;
                if (colorCount[rgb] > maxCount) {
                    maxCount = colorCount[rgb];
                    dominantColor = rgb;
                }
            }
            return dominantColor;
        }

        // --- Asset Generators ---
        function generateIco() {
            if (!uploadedImage) return;
            showLoader();
            setTimeout(() => {
                const sizes = [16, 32, 48];
                const pngBuffers = [];
                sizes.forEach(size => {
                    const canvas = document.createElement('canvas');
                    canvas.width = size; canvas.height = size;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(uploadedImage, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL('image/png');
                    const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
                    const binaryData = atob(base64Data);
                    const buffer = new Uint8Array(binaryData.length);
                    for (let i = 0; i < binaryData.length; i++) buffer[i] = binaryData.charCodeAt(i);
                    pngBuffers.push({ size, buffer });
                });
                const headerSize = 6, directorySize = 16 * sizes.length;
                let fileLength = headerSize + directorySize;
                pngBuffers.forEach(p => fileLength += p.buffer.length);
                const fileBuffer = new ArrayBuffer(fileLength);
                const view = new DataView(fileBuffer);
                view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, sizes.length, true);
                let offset = headerSize, imageOffset = headerSize + directorySize;
                pngBuffers.forEach(img => {
                    view.setUint8(offset, img.size); view.setUint8(offset + 1, img.size);
                    view.setUint8(offset + 2, 0); view.setUint8(offset + 3, 0);
                    view.setUint16(offset + 4, 1, true); view.setUint16(offset + 6, 32, true);
                    view.setUint32(offset + 8, img.buffer.length, true);
                    view.setUint32(offset + 12, imageOffset, true);
                    offset += 16; imageOffset += img.buffer.length;
                });
                const finalFile = new Uint8Array(fileBuffer);
                let currentOffset = headerSize + directorySize;
                pngBuffers.forEach(img => {
                    finalFile.set(img.buffer, currentOffset);
                    currentOffset += img.buffer.length;
                });
                const blob = new Blob([finalFile], { type: 'image/x-icon' });
                const icoUrl = URL.createObjectURL(blob);
                autoDownload(icoUrl, `${imageName}.ico`);
                displayPreview(icoUrl, true);
                hideLoader();
            }, 50);
        }

        async function generateSplashScreens() {
            if (!uploadedImage) return;
            showLoader();
            const dominantColor = getDominantColor(uploadedImage);
            const splashSizes = [
                { width: 1125, height: 2436, name: 'iPhone-X-XS' },
                { width: 1242, height: 2688, name: 'iPhone-XS-Max' },
                { width: 828, height: 1792, name: 'iPhone-XR' },
                { width: 1242, height: 2208, name: 'iPhone-Plus' },
                { width: 1080, height: 1920, name: 'Android-FHD' },
                { width: 2048, height: 2732, name: 'iPad-Pro-12.9' }
            ];
            const files = [];
            splashSizes.forEach(size => {
                const canvas = document.createElement('canvas');
                canvas.width = size.width; canvas.height = size.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = dominantColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const iconSize = 128;
                const x = (canvas.width - iconSize) / 2;
                const y = (canvas.height - iconSize) / 2;
                ctx.drawImage(uploadedImage, x, y, iconSize, iconSize);
                files.push({ name: `splash-${size.name}.png`, dataUrl: canvas.toDataURL('image/png') });
            });
            await createAndDownloadZip(files, 'splash-screens.zip');
            hideLoader();
        }

        async function generateAppIcons() {
            if (!uploadedImage) return;
            showLoader();
            const iconSizes = [
                // iOS
                { size: 1024, name: 'ios/AppStore.png' }, { size: 180, name: 'ios/Icon-60@3x.png' },
                { size: 120, name: 'ios/Icon-60@2x.png' }, { size: 87, name: 'ios/Icon-29@3x.png' },
                // Android
                { size: 192, name: 'android/mipmap-xxxhdpi/ic_launcher.png' },
                { size: 144, name: 'android/mipmap-xxhdpi/ic_launcher.png' },
                { size: 96, name: 'android/mipmap-xhdpi/ic_launcher.png' },
                { size: 72, name: 'android/mipmap-hdpi/ic_launcher.png' },
            ];
            const files = [];
            iconSizes.forEach(s => {
                const canvas = document.createElement('canvas');
                canvas.width = s.size; canvas.height = s.size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(uploadedImage, 0, 0, s.size, s.size);
                files.push({ name: s.name, dataUrl: canvas.toDataURL('image/png') });
            });
            await createAndDownloadZip(files, 'app-icons.zip');
            hideLoader();
        }

        // --- NEW DOCUMENT PHOTO GENERATOR ---
        async function generateDocumentPhotos() {
            if (!uploadedImage) return;
            showLoader();

            const docType = document.getElementById('doc-photo-size').value;
            const DPI = 300;
            const MM_PER_INCH = 25.4;

            const docSizes = {
                'passport-us': { w: 51, h: 51 }, // 2x2 in in mm
                'schengen-visa': { w: 35, h: 45 }, // 3.5x4.5 cm in mm
                'passport-co': { w: 40, h: 50 }, // 4x5 cm in mm
                'passport-mx': { w: 35, h: 45 } // 3.5x4.5 cm in mm
            };

            const selectedSize = docSizes[docType];

            // Convert print size (4x6 inches) to pixels
            const printWidthPx = 4 * DPI;
            const printHeightPx = 6 * DPI;

            // Convert document size from mm to pixels
            const docWidthPx = (selectedSize.w / MM_PER_INCH) * DPI;
            const docHeightPx = (selectedSize.h / MM_PER_INCH) * DPI;

            const canvas = document.createElement('canvas');
            canvas.width = printWidthPx;
            canvas.height = printHeightPx;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate how many photos fit
            const cols = Math.floor(printWidthPx / docWidthPx);
            const rows = Math.floor(printHeightPx / docHeightPx);
            const totalPhotos = cols * rows;

            // Draw photos on the sheet
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    const x = j * docWidthPx;
                    const y = i * docHeightPx;
                    ctx.drawImage(uploadedImage, x, y, docWidthPx, docHeightPx);
                }
            }

            setTimeout(() => {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                autoDownload(dataUrl, `photo_document_${docType}.jpg`);
                displayPreview(dataUrl);
                hideLoader();
            }, 50);
        }


        // --- ZIP Utility ---
        async function createAndDownloadZip(files, zipName) {
            const zip = new JSZip();
            for (const file of files) {
                const response = await fetch(file.dataUrl);
                const blob = await response.blob();
                zip.file(file.name, blob);
            }
            zip.generateAsync({ type: "blob" }).then(content => {
                autoDownload(URL.createObjectURL(content), zipName);
            });
        }

        // --- Download and Display Utilities ---
        function autoDownload(dataUrl, filename) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            if (dataUrl.startsWith('blob:')) {
                URL.revokeObjectURL(dataUrl);
            }
        }

        function displayPreview(dataUrl, isIco = false) {
            outputDiv.innerHTML = '<h3>Last Result:</h3>';
            const container = document.createElement('div');
            container.className = 'output-image-container';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.className = 'output-image';
            if (isIco) { img.style.width = '48px'; img.style.height = '48px'; }
            container.appendChild(img);
            outputDiv.appendChild(container);
        }
    });
})();