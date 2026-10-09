const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const outputDir = path.join(__dirname, '../../templates');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Generate Recipes_Master_Template.xlsx
const recipeWb = xlsx.utils.book_new();

const recipes = [
    {
        name: 'Dal Makhani 300g',
        nominalYield: 250,
        batchWeight: 75,
        ingredients: [
            ['Black Urad Dal', 'RM-PUL-001', 30, 'kg', 1.0, 'Ambient', 'Soaking & Boiling'],
            ['Rajma', 'RM-PUL-002', 10, 'kg', 1.0, 'Ambient', 'Soaking & Boiling'],
            ['Onion', 'RM-VEG-001', 25, 'kg', 1.176, 'Cold', 'Peeling & Pureeing (100/85 factor)'],
            ['Tomato Puree', 'RM-VEG-002', 30, 'kg', 1.0, 'Ambient', 'Base Gravy'],
            ['Butter', 'RM-DAI-001', 15, 'kg', 1.0, 'Cold', 'Finishing'],
            ['Fresh Cream', 'RM-DAI-002', 8, 'L', 1.0, 'Cold', 'Finishing'],
            ['Ginger Garlic Paste', 'RM-VEG-003', 5, 'kg', 1.0, 'Cold', 'Tadka'],
            ['Degi Mirch', 'RM-SPI-001', 1.5, 'kg', 1.0, 'Ambient', 'Color & Spicing'],
            ['Garam Masala', 'RM-SPI-002', 0.8, 'kg', 1.0, 'Ambient', 'Flavoring'],
            ['Salt', 'RM-SPI-003', 2.5, 'kg', 1.0, 'Ambient', 'Seasoning']
        ]
    },
    {
        name: 'Paneer Butter Masala 250g',
        nominalYield: 200,
        batchWeight: 50,
        ingredients: [
            ['Paneer', 'RM-DAI-003', 25, 'kg', 1.05, 'Cold', 'Dicing loss'],
            ['Onion', 'RM-VEG-001', 20, 'kg', 1.176, 'Cold', 'Peeling loss (100/85 factor)'],
            ['Tomato Puree', 'RM-VEG-002', 35, 'kg', 1.0, 'Ambient', 'Makhani Gravy'],
            ['Cashew Nut', 'RM-NUT-001', 6, 'kg', 1.0, 'Ambient', 'Paste'],
            ['Butter', 'RM-DAI-001', 12, 'kg', 1.0, 'Cold', 'Cooking & Finishing'],
            ['Fresh Cream', 'RM-DAI-002', 6, 'L', 1.0, 'Cold', 'Finishing'],
            ['Kasturi Methi', 'RM-SPI-004', 200, 'g', 1.0, 'Ambient', 'Finishing'],
            ['Salt', 'RM-SPI-003', 1.8, 'kg', 1.0, 'Ambient', 'Seasoning']
        ]
    },
    {
        name: 'Rajma Masala 300g',
        nominalYield: 250,
        batchWeight: 75,
        ingredients: [
            ['Rajma', 'RM-PUL-002', 35, 'kg', 1.0, 'Ambient', 'Soaking & Boiling'],
            ['Onion', 'RM-VEG-001', 28, 'kg', 1.176, 'Cold', 'Peeling loss (100/85 factor)'],
            ['Tomato Puree', 'RM-VEG-002', 25, 'kg', 1.0, 'Ambient', 'Gravy'],
            ['Refined Oil', 'RM-OIL-001', 8, 'L', 1.0, 'Ambient', 'Tadka'],
            ['Ginger Garlic Paste', 'RM-VEG-003', 4, 'kg', 1.0, 'Cold', 'Tadka'],
            ['Red Chilli Powder', 'RM-SPI-005', 1.2, 'kg', 1.0, 'Ambient', 'Spicing'],
            ['Salt', 'RM-SPI-003', 2.2, 'kg', 1.0, 'Ambient', 'Seasoning']
        ]
    }
];

recipes.forEach(rec => {
    const wsData = [
        ['Nominal Batch Yield (Pouches)', rec.nominalYield],
        ['Batch Cooked Weight (kg)', rec.batchWeight],
        [],
        ['Ingredient Name', 'Material Code', 'Edible Qty (per batch)', 'Unit', 'Preparation / Loss Factor', 'Storage Type', 'Notes / Stage'],
        ...rec.ingredients
    ];
    const ws = xlsx.utils.aoa_to_sheet(wsData);
    xlsx.utils.book_append_sheet(recipeWb, ws, rec.name);
});

const recipePath = path.join(outputDir, 'Recipes_Master_Template.xlsx');
xlsx.writeFile(recipeWb, recipePath);
console.log('Saved recipe template to:', recipePath);

// 2. Generate Opening_Stock_Template.xlsx
const stockWb = xlsx.utils.book_new();
const stockHeaders = [
    'Material Name',
    'Material Code',
    'Storage Type',
    'Opening Balance',
    'Unit',
    'Rate (INR/kg or INR/L)',
    'Expiry Date',
    'Lead Time (Days)',
    'Min Safety Stock (kg/L)',
    'Commercial Bag Size (kg/L)',
    'Preferred Supplier'
];

const stockRows = [
    ['Onion', 'RM-VEG-001', 'Cold', 200, 'kg', 24.5, '2026-10-18', 1, 50, 50, 'Local Mandi / Farmer Direct'],
    ['Tomato Puree', 'RM-VEG-002', 'Ambient', 450, 'kg', 42.0, '2027-01-15', 3, 100, 20, 'Vardhman Agro Foods'],
    ['Butter', 'RM-DAI-001', 'Cold', 80, 'kg', 425.0, '2026-10-28', 2, 25, 10, 'Amul Distributorship'],
    ['Fresh Cream', 'RM-DAI-002', 'Cold', 40, 'L', 185.0, '2026-10-20', 1, 15, 1, 'Mother Dairy / Amul'],
    ['Black Urad Dal', 'RM-PUL-001', 'Ambient', 500, 'kg', 110.0, '2027-04-30', 5, 100, 50, 'Shree Ram Traders'],
    ['Rajma', 'RM-PUL-002', 'Ambient', 350, 'kg', 125.0, '2027-04-30', 5, 80, 50, 'Shree Ram Traders'],
    ['Ginger Garlic Paste', 'RM-VEG-003', 'Cold', 50, 'kg', 90.0, '2026-11-15', 2, 15, 5, 'Fresh Aromas'],
    ['Cashew Nut', 'RM-NUT-001', 'Ambient', 60, 'kg', 650.0, '2027-06-30', 4, 15, 10, 'Goa Dry Fruits'],
    ['Refined Oil', 'RM-OIL-001', 'Ambient', 120, 'L', 115.0, '2027-02-28', 3, 30, 15, 'Fortune Oil Agency'],
    ['Paneer', 'RM-DAI-003', 'Cold', 60, 'kg', 310.0, '2026-10-14', 1, 20, 5, 'Local Dairy Coop'],
    ['Degi Mirch', 'RM-SPI-001', 'Ambient', 40, 'kg', 320.0, '2027-08-31', 7, 10, 25, 'MDH / Catch Spice Agency'],
    ['Garam Masala', 'RM-SPI-002', 'Ambient', 30, 'kg', 450.0, '2027-08-31', 7, 10, 5, 'Everest Wholesale'],
    ['Salt', 'RM-SPI-003', 'Ambient', 150, 'kg', 18.0, '2028-01-01', 7, 50, 50, 'Tata Salt Distributor']
];

const stockWs = xlsx.utils.aoa_to_sheet([stockHeaders, ...stockRows]);
xlsx.utils.book_append_sheet(stockWb, stockWs, 'Opening Stock');

const stockPath = path.join(outputDir, 'Opening_Stock_Template.xlsx');
xlsx.writeFile(stockWb, stockPath);
console.log('Saved opening stock template to:', stockPath);
