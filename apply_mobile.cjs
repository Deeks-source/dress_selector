const fs = require('fs');
const path = require('path');

const applyMobileFixes = () => {
    // 1. ItemCard.tsx
    let itemCardPath = path.resolve('src/components/ItemCard.tsx');
    if (!fs.existsSync(itemCardPath)) itemCardPath = path.resolve('components/ItemCard.tsx');
    if (fs.existsSync(itemCardPath)) {
        let content = fs.readFileSync(itemCardPath, 'utf8');
        
        // Scale down container sizes and paddings
        content = content.replace(/p-4 sm:p-6 pb-6/g, 'p-3 sm:p-6 pb-4 sm:pb-6');
        content = content.replace(/w-\[120px\] h-\[120px\]/g, 'w-[70px] h-[70px]');
        content = content.replace(/text-\[22px\]/g, 'text-lg sm:text-[22px]');
        content = content.replace(/text-\[11px\] sm:text-xs/g, 'text-[9px] sm:text-[11px]');
        content = content.replace(/px-4 py-2/g, 'px-2 py-1.5 sm:px-4 sm:py-2');
        content = content.replace(/p-2\.5 rounded-2xl/g, 'p-2 sm:p-2.5 rounded-xl sm:rounded-2xl');
        content = content.replace(/text-\[13px\]/g, 'text-[11px] sm:text-[13px]');
        content = content.replace(/pt-4/g, 'pt-2 sm:pt-4');
        content = content.replace(/pt-4 mt-2/g, 'pt-3 mt-1 sm:pt-4 sm:mt-2');
        content = content.replace(/gap-3 pt-4/g, 'gap-2 sm:gap-3 pt-2 sm:pt-4');
        content = content.replace(/gap-3/g, 'gap-2 sm:gap-3');
        content = content.replace(/gap-y-3 gap-x-4/g, 'gap-y-2 sm:gap-y-3 gap-x-3 sm:gap-x-4');
        content = content.replace(/w-5 h-5/g, 'w-4 h-4 sm:w-5 sm:h-5');
        content = content.replace(/text-\[14px\]/g, 'text-xs sm:text-[14px]');
        content = content.replace(/p-4 sm:p-6 space-y-4/g, 'p-3 sm:p-6 space-y-3 sm:space-y-4');
        
        fs.writeFileSync(itemCardPath, content, 'utf8');
        console.log('Fixed ItemCard.tsx');
    }

    // 2. WardrobeGrid.tsx
    let wardrobePath = path.resolve('src/components/WardrobeGrid.tsx');
    if (!fs.existsSync(wardrobePath)) wardrobePath = path.resolve('components/WardrobeGrid.tsx');
    if (fs.existsSync(wardrobePath)) {
        let content = fs.readFileSync(wardrobePath, 'utf8');
        
        content = content.replace(/gap-4 sm:gap-10/g, 'gap-3 sm:gap-10');
        content = content.replace(/gap-4 sm:gap-6/g, 'gap-3 sm:gap-6');
        content = content.replace(/grid-cols-2 lg:grid-cols-4/g, 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
        content = content.replace(/text-3xl sm:text-4xl/g, 'text-2xl sm:text-4xl');
        
        fs.writeFileSync(wardrobePath, content, 'utf8');
        console.log('Fixed WardrobeGrid.tsx');
    }

    // 3. CostumeDesigner.tsx
    let designerPath = path.resolve('src/components/CostumeDesigner.tsx');
    if (!fs.existsSync(designerPath)) designerPath = path.resolve('components/CostumeDesigner.tsx');
    if (fs.existsSync(designerPath)) {
        let content = fs.readFileSync(designerPath, 'utf8');
        
        content = content.replace(/h-\[600px\] sm:h-\[800px\]/g, 'h-[400px] sm:h-[800px]');
        content = content.replace(/text-3xl sm:text-5xl/g, 'text-2xl sm:text-5xl');
        content = content.replace(/text-4xl sm:text-6xl/g, 'text-2xl sm:text-6xl');
        content = content.replace(/w-24 h-24/g, 'w-16 h-16 sm:w-24 sm:h-24');
        content = content.replace(/p-16/g, 'p-8 sm:p-16');
        content = content.replace(/w-20 h-20/g, 'w-12 h-12 sm:w-20 sm:h-20');
        content = content.replace(/p-6 sm:p-10/g, 'p-4 sm:p-10');
        content = content.replace(/text-\[22px\]/g, 'text-lg sm:text-[22px]');
        
        fs.writeFileSync(designerPath, content, 'utf8');
        console.log('Fixed CostumeDesigner.tsx');
    }

    // 4. OutfitRecommender.tsx
    let recommenderPath = path.resolve('src/components/OutfitRecommender.tsx');
    if (!fs.existsSync(recommenderPath)) recommenderPath = path.resolve('components/OutfitRecommender.tsx');
    if (fs.existsSync(recommenderPath)) {
        let content = fs.readFileSync(recommenderPath, 'utf8');
        
        content = content.replace(/text-4xl sm:text-6xl/g, 'text-3xl sm:text-6xl');
        content = content.replace(/h-\[600px\] sm:h-\[800px\]/g, 'h-[400px] sm:h-[800px]');
        content = content.replace(/p-6 sm:p-10/g, 'p-4 sm:p-10');
        content = content.replace(/p-6 sm:p-8/g, 'p-4 sm:p-8');
        
        fs.writeFileSync(recommenderPath, content, 'utf8');
        console.log('Fixed OutfitRecommender.tsx');
    }
};

applyMobileFixes();
