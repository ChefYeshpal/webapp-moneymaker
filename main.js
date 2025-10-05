// Game constants
const BOTTLE_COST = 0.5; // Cost of empty bottle in INR (50 paise)
const FILTERED_WATER_COST = 3; // Cost of filtered water per bottle in INR
const RIVER_WATER_COST = 0; // Cost of river water (free)
const MIN_STARTING_MONEY = 5;
const MAX_STARTING_MONEY = 50;
let gameState = {
    day: 1,
    money: 0,
    totalProfit: 0,
    currentStep: 'intro',
    bottlesBought: 0,
    sellingPrice: 0,
    waterType: '',
    riverWaterUsage: 0,
    totalCost: 0,
    consecutiveProfitDays: 0,
    consecutiveLossDays: 0,
    totalRiverWaterBottlesSold: 0,
    totalFilteredWaterBottlesSold: 0,
    // Reputation system for filtered water quality
    consecutiveFilteredDays: 0,
    consecutiveRiverDays: 0,
    reputationBonus: 0, // Percentage bonus for sales (0-30%)
    lastWaterType: '', // Track previous day's water type
    // Mixed water mode variables
    mixedWaterMode: false,
    maxFilteredBottles: 0,
    remainingBottles: 0,
    filterCost: 0,
    // Price consistency tracking
    lastPrice: 0,
    consecutiveSamePriceDays: 0,
    priceConsistencyBonus: 0, // Percentage bonus for price consistency (0-80%)
    priceChanges: 0, // Track total price changes
    recentPriceChanges: [], // Track recent price changes for fluctuation penalty
    inventory: {
        riverWaterBottles: 0,
        filteredWaterBottles: 0,
        emptyBottles: 0
    }
};
// DOM elements
let storyTextElement;
let inputSection;
let userInput;
let submitButton;
let animationToggle;

// Typewriter control variables
let isTyping = false;
let skipTyping = false;
let currentTypingElement = null;
let instantMode = false;
// Game flow steps
var GameStep;
(function (GameStep) {
    GameStep["INTRO"] = "intro";
    GameStep["BUY_BOTTLES"] = "buy_bottles";
    GameStep["CHOOSE_WATER"] = "choose_water";
    GameStep["GO_TO_STATION"] = "go_to_station";
    GameStep["SET_PRICE"] = "set_price";
    GameStep["SELLING"] = "selling";
    GameStep["DAY_RESULTS"] = "day_results";
    GameStep["NEXT_DAY"] = "next_day";
})(GameStep || (GameStep = {}));
// Utility functions
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function typewriterText(text, speed = 50) {
    const paragraph = document.createElement('div');
    paragraph.className = 'story-paragraph';
    storyTextElement.appendChild(paragraph);
    
    // If instant mode is enabled, show text immediately but with 1sec delay
    if (instantMode) {
        paragraph.textContent = text;
        // Auto-scroll to the new paragraph in step mode - scroll down more
        setTimeout(() => {
            paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50); // Small delay to ensure text is rendered
        await sleep(1000); // 1 second pause between lines
        return;
    }
    
    isTyping = true;
    currentTypingElement = paragraph;
    skipTyping = false;
    await sleep(500); // Pause before typing
    // If skip was triggered during the initial pause, complete immediately
    if (skipTyping) {
        paragraph.textContent = text;
        isTyping = false;
        currentTypingElement = null;
        await sleep(200); // Brief pause
        return;
    }
    for (let i = 0; i <= text.length; i++) {
        // Check if we should skip typing
        if (skipTyping) {
            paragraph.textContent = text;
            break;
        }
        paragraph.textContent = text.slice(0, i);
        await sleep(speed);
    }
    isTyping = false;
    currentTypingElement = null;
    
    // Auto-scroll after typing is complete in type mode
    setTimeout(() => {
        paragraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    await sleep(skipTyping ? 200 : 800); // Shorter pause if skipped
}
async function showText(text) {
    const paragraph = document.createElement('div');
    paragraph.className = 'story-paragraph';
    paragraph.textContent = text;
    storyTextElement.appendChild(paragraph);
    await sleep(1000);
}
function showInput(placeholder = "Type your answer...") {
    userInput.placeholder = placeholder;
    userInput.value = '';
    inputSection.classList.remove('hidden');
    // Small delay to ensure display is set, then trigger animation
    setTimeout(() => {
        inputSection.classList.add('show');
        userInput.focus();
    }, 50);
}
function hideInput() {
    inputSection.classList.remove('show');
    // Wait for animation to complete before hiding
    setTimeout(() => {
        inputSection.classList.add('hidden');
    }, 400);
}
function clearStory() {
    storyTextElement.innerHTML = '';
}
function skipCurrentTyping() {
    if (isTyping && currentTypingElement) {
        skipTyping = true;
    }
}

// Reputation system functions
function updateReputation(currentWaterType) {
    // Update consecutive day counters
    if (currentWaterType === 'filtered') {
        gameState.consecutiveFilteredDays++;
        gameState.consecutiveRiverDays = 0;
    } else if (currentWaterType === 'river') {
        gameState.consecutiveRiverDays++;
        gameState.consecutiveFilteredDays = 0;
    }
    
    // Calculate reputation bonus (starts after 5 consecutive days of filtered water)
    if (gameState.consecutiveFilteredDays >= 5) {
        // Increase bonus by 2% per day after day 5, max 30%
        const bonusDays = gameState.consecutiveFilteredDays - 4;
        gameState.reputationBonus = Math.min(30, bonusDays * 2);
    } else if (gameState.consecutiveRiverDays >= 1) {
        // Decrease bonus by 3% per day of river water usage
        gameState.reputationBonus = Math.max(0, gameState.reputationBonus - (gameState.consecutiveRiverDays * 3));
    }
    
    gameState.lastWaterType = currentWaterType;
}

async function showReputationStatus() {
    if (gameState.day >= 2) { // Only show from day 2 onwards
        if (gameState.consecutiveFilteredDays >= 5) {
            showReputationNotification(
                '🌟', 
                'Quality Reputation Boost!', 
                `+${gameState.reputationBonus}% sales from ${gameState.consecutiveFilteredDays} days of filtered water`
            );
        } else if (gameState.consecutiveFilteredDays >= 3) {
            const daysLeft = 5 - gameState.consecutiveFilteredDays;
            showReputationNotification(
                '📈', 
                'Building Reputation...', 
                `${daysLeft} more filtered water days for sales boost`
            );
        } else if (gameState.reputationBonus > 0 && gameState.consecutiveRiverDays >= 1) {
            showReputationNotification(
                '📉', 
                'Reputation Declining', 
                `Lost ${gameState.consecutiveRiverDays * 3}% from river water (${gameState.reputationBonus}% remaining)`
            );
        }
    }
}

function showReputationNotification(icon, title, message) {
    // Use the existing achievement notification system
    if (window.achievementManager) {
        const fakeAchievement = {
            icon: icon,
            name: title,
            description: message,
            customTitle: 'Reputation Update'
        };
        window.achievementManager.showNotification(fakeAchievement);
    }
}

// Price consistency system functions
function updatePriceConsistency(currentPrice) {
    // Check if this is the first day or if price changed
    if (gameState.day === 1) {
        gameState.lastPrice = currentPrice;
        gameState.consecutiveSamePriceDays = 1;
        console.log(`🏷️ [Price Tracking] Day ${gameState.day}: First day, price set to ₹${currentPrice}`);
        return;
    }
    
    if (currentPrice === gameState.lastPrice) {
        // Same price as previous day
        gameState.consecutiveSamePriceDays++;
        console.log(`🏷️ [Price Tracking] Day ${gameState.day}: Same price (₹${currentPrice}) for ${gameState.consecutiveSamePriceDays} consecutive days`);
    } else {
        // Price changed
        gameState.priceChanges++;
        gameState.recentPriceChanges.push({
            day: gameState.day,
            oldPrice: gameState.lastPrice,
            newPrice: currentPrice
        });
        
        // Keep only last 10 price changes for fluctuation calculation
        if (gameState.recentPriceChanges.length > 10) {
            gameState.recentPriceChanges.shift();
        }
        
        console.log(`🏷️ [Price Tracking] Day ${gameState.day}: Price changed from ₹${gameState.lastPrice} to ₹${currentPrice} (Total changes: ${gameState.priceChanges})`);
        
        // Reset consecutive days counter
        gameState.consecutiveSamePriceDays = 1;
        gameState.lastPrice = currentPrice;
    }
    
    // Calculate price consistency bonus (20% every 5 days, max 80%)
    const bonusMultiplier = Math.floor(gameState.consecutiveSamePriceDays / 5);
    gameState.priceConsistencyBonus = Math.min(80, bonusMultiplier * 20);
    
    if (gameState.priceConsistencyBonus > 0) {
        console.log(`📈 [Price Consistency] Bonus: ${gameState.priceConsistencyBonus}% (${gameState.consecutiveSamePriceDays} consecutive days)`);
    }
}

function calculateFluctuationPenalty() {
    // Calculate penalty based on recent price changes
    if (gameState.recentPriceChanges.length < 2) {
        return 0; // No penalty if less than 2 changes
    }
    
    // Calculate average change magnitude over recent changes
    let totalChange = 0;
    for (let i = 0; i < gameState.recentPriceChanges.length; i++) {
        const change = gameState.recentPriceChanges[i];
        const changeMagnitude = Math.abs(change.newPrice - change.oldPrice);
        totalChange += changeMagnitude;
    }
    
    const averageChange = totalChange / gameState.recentPriceChanges.length;
    const changeFrequency = gameState.recentPriceChanges.length;
    
    // Penalty calculation: more frequent changes and larger changes = higher penalty
    // Max penalty: 30% (when changes are frequent and large)
    const frequencyPenalty = Math.min(15, changeFrequency * 1.5); // Up to 15% for frequency
    const magnitudePenalty = Math.min(15, averageChange * 2); // Up to 15% for magnitude
    
    const totalPenalty = Math.min(30, frequencyPenalty + magnitudePenalty);
    
    if (totalPenalty > 0) {
        console.log(`📉 [Price Fluctuation] Penalty: ${totalPenalty.toFixed(1)}% (${changeFrequency} recent changes, avg magnitude: ₹${averageChange.toFixed(2)})`);
    }
    
    return totalPenalty;
}

function toggleAnimationMode() {
    instantMode = !instantMode;
    const toggleButton = document.getElementById('animation-toggle');
    const toggleIcon = toggleButton.querySelector('.toggle-icon');
    const toggleText = toggleButton.querySelector('.toggle-text');
    
    if (instantMode) {
        toggleIcon.textContent = '⏱️';
        toggleText.textContent = 'Step Mode';
        toggleButton.title = 'Switch to typewriter animation';
    } else {
        toggleIcon.textContent = '⚡';
        toggleText.textContent = 'Type Mode';
        toggleButton.title = 'Switch to step-by-step text';
    }
    
    // Save preference to localStorage
    localStorage.setItem('waterBottleTycoon_instantMode', instantMode.toString());
}
async function showInventoryStatus() {
    const totalBottles = gameState.inventory.riverWaterBottles + gameState.inventory.filteredWaterBottles + gameState.inventory.emptyBottles;
    if (totalBottles > 0 || gameState.day > 1) {
        await typewriterText("=== Inventory Check ===", 60);
        await typewriterText(`Bottles with river water: ${gameState.inventory.riverWaterBottles}`, 40);
        await typewriterText(`Bottles with filtered water: ${gameState.inventory.filteredWaterBottles}`, 40);
        await typewriterText(`Empty bottles: ${gameState.inventory.emptyBottles}`, 40);
        await typewriterText(`Total money: ₹${gameState.money.toFixed(2)}`, 40);
        await sleep(1000);
    }
}
async function showProgressBar(message, duration = 3000) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    progressContainer.innerHTML = `
        <div class="progress-message">${message}</div>
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>
    `;
    storyTextElement.appendChild(progressContainer);
    const progressFill = progressContainer.querySelector('.progress-fill');
    // Animate the progress bar
    let progress = 0;
    const interval = 50;
    const increment = (interval / duration) * 100;
    return new Promise((resolve) => {
        const timer = setInterval(() => {
            progress += increment;
            progressFill.style.width = `${Math.min(progress, 100)}%`;
            if (progress >= 100) {
                clearInterval(timer);
                setTimeout(() => {
                    progressContainer.remove();
                    resolve();
                }, 500);
            }
        }, interval);
    });
}
// Game logic functions
async function startIntro() {
    await typewriterText("# Water Bottle Tycoon", 100);
    await sleep(1000);
    await typewriterText("You are a very poor person, and you somehow managed to get hold of some money (legally) and you want to make more money...", 40);
    await typewriterText("So you decide that you will sell water bottles.", 40);
    await typewriterText("But first, let me explain how this works:", 40);
    await typewriterText("• Empty bottles cost ₹0.50 each (50 paise)", 40);
    await typewriterText("• You need to fill them with water", 40);
    await typewriterText("• Filtered water costs ₹3 per bottle", 40);
    await typewriterText("• River water is free (but...)", 40);
    await sleep(1000);
    // Generate random starting money
    gameState.money = getRandomInt(MIN_STARTING_MONEY, MAX_STARTING_MONEY);
    gameState.day = 1;
    await typewriterText(`You wake up on Day ${gameState.day} and check your pocket...`, 40);
    await typewriterText(`You have ₹${gameState.money} with you!`, 40);
    gameState.currentStep = GameStep.BUY_BOTTLES;
    await askBuyBottles();
}
async function askBuyBottles() {
    const maxBottles = Math.floor(gameState.money / BOTTLE_COST);
    await typewriterText(`With ₹${gameState.money}, you can buy a maximum of ${maxBottles} empty bottles at ₹0.50 each.`, 40);
    await typewriterText("How many bottles do you want to buy?", 40);
    showInput(`Enter a number between 1 and ${maxBottles}`);
}
async function processBuyBottles(input) {
    const bottles = parseInt(input);
    const maxBottles = Math.floor(gameState.money / BOTTLE_COST);
    if (isNaN(bottles) || bottles < 1 || bottles > maxBottles) {
        await typewriterText(`Please enter a valid number between 1 and ${maxBottles}.`, 40);
        showInput(`Enter a number between 1 and ${maxBottles}`);
        return;
    }
    gameState.bottlesBought = bottles;
    gameState.money -= bottles * BOTTLE_COST;
    gameState.totalCost = bottles * BOTTLE_COST;
    hideInput();
    await typewriterText(`You bought ${bottles} empty bottles for ₹${(bottles * BOTTLE_COST).toFixed(2)}.`, 40);
    await typewriterText(`You have ₹${gameState.money.toFixed(2)} left.`, 40);
    gameState.currentStep = GameStep.CHOOSE_WATER;
    await askWaterChoice();
}
async function askWaterChoice() {
    await typewriterText("Now you need to fill the bottles with water.", 40);
    await typewriterText(`Option 1: Filtered water - ₹3 per bottle (Total: ₹${(gameState.bottlesBought * FILTERED_WATER_COST).toFixed(2)})`, 40);
    await typewriterText("Option 2: River water - Free (but you never know...)", 40);
    const canAffordFiltered = gameState.money >= gameState.bottlesBought * FILTERED_WATER_COST;
    if (!canAffordFiltered) {
        await typewriterText("⚠️ You don't have enough money for filtered water!", 40);
        
        // Check if they have at least ₹3 and can afford at least 1 bottle of filtered water
        if (gameState.money >= 3) {
            const maxFilteredBottles = Math.floor(gameState.money / FILTERED_WATER_COST);
            const remainingBottles = gameState.bottlesBought - maxFilteredBottles;
            const filterCost = maxFilteredBottles * FILTERED_WATER_COST;
            
            await typewriterText(`But you can fill ${maxFilteredBottles} bottle(s) with filtered water for ₹${filterCost.toFixed(2)}.`, 40);
            await typewriterText(`The remaining ${remainingBottles} bottle(s) would be filled with river water.`, 40);
            await typewriterText("Do you want to fill as many as possible with filtered water and the rest with river water?", 40);
            
            // Set a flag to indicate we're in mixed water mode
            gameState.mixedWaterMode = true;
            gameState.maxFilteredBottles = maxFilteredBottles;
            gameState.remainingBottles = remainingBottles;
            gameState.filterCost = filterCost;
            
            showInput("Type 'yes'/'y' or 'no'/'n'");
            return;
        } else {
            await typewriterText("You'll have to use river water.", 40);
            await processWaterChoice('river');
            return;
        }
    }
    await typewriterText("Which water do you choose?", 40);
    showInput("Type 'filtered'/'filter'/'1' or 'river'/'2'");
}
async function processWaterChoice(input) {
    const choice = input.toLowerCase().trim();
    
    // Handle mixed water mode responses
    if (gameState.mixedWaterMode) {
        if (choice === 'yes' || choice === 'y') {
            // User chose mixed water option
            hideInput();
            
            // Deduct money for filtered water
            gameState.money -= gameState.filterCost;
            gameState.totalCost += gameState.filterCost;
            
            // Update inventory
            gameState.inventory.filteredWaterBottles += gameState.maxFilteredBottles;
            gameState.inventory.riverWaterBottles += gameState.remainingBottles;
            
            // Set water type as mixed and update reputation
            gameState.waterType = 'mixed';
            gameState.riverWaterUsage++; // Still counts as river water usage for reputation
            updateReputation('river'); // Mixed counts as river for reputation purposes
            
            await typewriterText(`Great! You filled ${gameState.maxFilteredBottles} bottles with filtered water for ₹${gameState.filterCost.toFixed(2)}.`, 40);
            await typewriterText(`The remaining ${gameState.remainingBottles} bottles were filled with river water.`, 40);
            
            // Clean up mixed water mode variables
            gameState.mixedWaterMode = false;
            delete gameState.maxFilteredBottles;
            delete gameState.remainingBottles;
            delete gameState.filterCost;
            
        } else if (choice === 'no' || choice === 'n') {
            // User declined mixed water, use all river water
            hideInput();
            gameState.waterType = 'river';
            gameState.riverWaterUsage++;
            updateReputation('river');
            gameState.inventory.riverWaterBottles += gameState.bottlesBought;
            
            await typewriterText("You chose to fill all bottles with river water - it's free!", 40);
            await typewriterText("You fill your bottles from the nearby river.", 40);
            
            // Clean up mixed water mode variables
            gameState.mixedWaterMode = false;
            delete gameState.maxFilteredBottles;
            delete gameState.remainingBottles;
            delete gameState.filterCost;
            
        } else {
            await typewriterText("Please type 'yes'/'y' or 'no'/'n'.", 40);
            showInput("Type 'yes'/'y' or 'no'/'n'");
            return;
        }
        
        // Show reputation status and continue
        showReputationStatus();
        await typewriterText(`Money left: ₹${gameState.money.toFixed(2)}`, 40);
        
        // Check big spender achievement
        if (window.achievementManager) {
            window.achievementManager.checkPurchaseAchievements(gameState);
        }
        
        gameState.currentStep = GameStep.GO_TO_STATION;
        await goToStation();
        return;
    }
    
    // Check for filtered water options
    if (choice === 'filtered' || choice === 'filter' || choice === '1') {
        gameState.waterType = 'filtered';
    }
    // Check for river water options
    else if (choice === 'river' || choice === '2') {
        gameState.waterType = 'river';
    }
    // Invalid input
    else {
        await typewriterText("Please type ''filtered', 'filter', '1' for filtered water, or 'river', '2' for river water.'", 40);
        showInput("Type 'filtered'/'filter'/'1' or 'river'/'2'");
        return;
    }
    
    hideInput();
    
    // Update reputation system based on water choice
    updateReputation(gameState.waterType);
    
    if (gameState.waterType === 'filtered') {
        const waterCost = gameState.bottlesBought * FILTERED_WATER_COST;
        gameState.money -= waterCost;
        gameState.totalCost += waterCost;
        await typewriterText(`You chose filtered water and paid ₹${waterCost.toFixed(2)}.`, 40);
        gameState.inventory.filteredWaterBottles += gameState.bottlesBought;
    }
    else {
        gameState.riverWaterUsage++;
        await typewriterText("You chose river water - it's free!", 40);
        await typewriterText("You fill your bottles from the nearby river.", 40);
        gameState.inventory.riverWaterBottles += gameState.bottlesBought;
    }
    
    // Show reputation status if applicable\n    showReputationStatus();\n    await typewriterText(`Money left: ₹${gameState.money.toFixed(2)}`, 40);
    
    // Check big spender achievement
    if (window.achievementManager) {
        window.achievementManager.checkPurchaseAchievements(gameState);
    }
    
    gameState.currentStep = GameStep.GO_TO_STATION;
    await goToStation();
}
async function goToStation() {
    await typewriterText("Time to head to the railway station to sell your water bottles...", 40);
    await sleep(1500);
    await typewriterText("*Walking to the station...*", 60);
    await sleep(1500);
    await typewriterText("You arrive at the busy railway station with your water bottles.", 40);
    gameState.currentStep = GameStep.SET_PRICE;
    await askSellingPrice();
}
async function askSellingPrice() {
    const totalBottles = gameState.inventory.riverWaterBottles + gameState.inventory.filteredWaterBottles;
    await typewriterText(`You have ${totalBottles} bottles to sell.`, 40);
    if (gameState.inventory.riverWaterBottles > 0 && gameState.inventory.filteredWaterBottles > 0) {
        await typewriterText(`(${gameState.inventory.riverWaterBottles} with river water, ${gameState.inventory.filteredWaterBottles} with filtered water)`, 30);
    }
    await typewriterText("At what price do you want to sell each bottle?", 40);
    
    // Only show pricing hint for the first 4 days
    if (gameState.day <= 4) {
        await typewriterText("(Remember: Higher prices = fewer sales, Lower prices = more sales)", 30);
    }
    
    showInput("Enter price in ₹ (e.g., 2.5)");
}
async function processSellingPrice(input) {
    const price = parseFloat(input);
    if (isNaN(price) || price <= 0) {
        await typewriterText("Please enter a valid price greater than ₹0.", 40);
        showInput("Enter price in ₹ (e.g., 2.5)");
        return;
    }
    gameState.sellingPrice = price;
    
    // Update price consistency tracking
    updatePriceConsistency(price);
    
    hideInput();
    await typewriterText(`You set the price at ₹${price} per bottle.`, 40);
    await typewriterText("Time to start selling!", 40);
    gameState.currentStep = GameStep.SELLING;
    await startSelling();
}
async function startSelling() {
    await showProgressBar("Selling bottles...", 3000);
    await simulateSales();
}
async function simulateSales() {
    // Calculate total bottles available for sale
    const totalBottles = gameState.inventory.riverWaterBottles + gameState.inventory.filteredWaterBottles;
    // Calculate sales based on price
    let salesMultiplier;
    if (gameState.sellingPrice <= 1.5) {
        salesMultiplier = 0.9; // High sales
    }
    else if (gameState.sellingPrice <= 3) {
        salesMultiplier = 0.7; // Good sales
    }
    else if (gameState.sellingPrice <= 5) {
        salesMultiplier = 0.5; // Moderate sales
    }
    else if (gameState.sellingPrice <= 9) {
        salesMultiplier = 0.3; // Low sales
    }
    else {
        salesMultiplier = 0.1; // Very low sales
    }
    // River water penalty
    if (gameState.waterType === 'river') {
        const penalty = Math.min(0.3, gameState.riverWaterUsage * 0.1); // Max 30% penalty
        salesMultiplier *= (1 - penalty);
    }
    
    // Apply reputation bonus from filtered water consistency
    const reputationMultiplier = 1 + (gameState.reputationBonus / 100);
    salesMultiplier *= reputationMultiplier;
    
    // Apply price consistency bonus
    const priceConsistencyMultiplier = 1 + (gameState.priceConsistencyBonus / 100);
    salesMultiplier *= priceConsistencyMultiplier;
    
    // Apply price fluctuation penalty
    const fluctuationPenalty = calculateFluctuationPenalty();
    const fluctuationMultiplier = 1 - (fluctuationPenalty / 100);
    salesMultiplier *= fluctuationMultiplier;
    
    // Console logging for sales calculation breakdown
    console.log(`📊 [Sales Calculation] Day ${gameState.day}:`);
    console.log(`  Base sales multiplier: ${(salesMultiplier / reputationMultiplier / priceConsistencyMultiplier / fluctuationMultiplier).toFixed(3)}`);
    if (gameState.reputationBonus > 0) {
        console.log(`  Reputation bonus: +${gameState.reputationBonus}% (×${reputationMultiplier.toFixed(3)})`);
    }
    if (gameState.priceConsistencyBonus > 0) {
        console.log(`  Price consistency bonus: +${gameState.priceConsistencyBonus}% (×${priceConsistencyMultiplier.toFixed(3)})`);
    }
    if (fluctuationPenalty > 0) {
        console.log(`  Price fluctuation penalty: -${fluctuationPenalty.toFixed(1)}% (×${fluctuationMultiplier.toFixed(3)})`);
    }
    console.log(`  Final sales multiplier: ${salesMultiplier.toFixed(3)}`);
    
    // Add some randomness
    const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    const actualSalesRate = Math.min(1, salesMultiplier * randomFactor);
    console.log(`  Random factor: ${randomFactor.toFixed(3)}, Final sales rate: ${actualSalesRate.toFixed(3)}`);
    
    const bottlesSold = Math.floor(totalBottles * actualSalesRate);
    const revenue = bottlesSold * gameState.sellingPrice;
    const profit = revenue - gameState.totalCost;
    // Update inventory by removing sold bottles (prioritize river water first)
    let remainingSold = bottlesSold;
    let riverWaterSold = 0;
    let filteredWaterSold = 0;
    if (remainingSold > 0 && gameState.inventory.riverWaterBottles > 0) {
        const riverSold = Math.min(remainingSold, gameState.inventory.riverWaterBottles);
        gameState.inventory.riverWaterBottles -= riverSold;
        remainingSold -= riverSold;
        riverWaterSold = riverSold;
        gameState.totalRiverWaterBottlesSold += riverSold;
    }
    if (remainingSold > 0 && gameState.inventory.filteredWaterBottles > 0) {
        const filteredSold = Math.min(remainingSold, gameState.inventory.filteredWaterBottles);
        gameState.inventory.filteredWaterBottles -= filteredSold;
        filteredWaterSold = filteredSold;
        gameState.totalFilteredWaterBottlesSold += filteredSold;
    }
    // Update game state
    gameState.money += revenue;
    gameState.totalProfit += profit;
    
    // Track consecutive profit/loss days
    if (profit > 0) {
        gameState.consecutiveProfitDays++;
        gameState.consecutiveLossDays = 0;
    } else if (profit < 0) {
        gameState.consecutiveLossDays++;
        gameState.consecutiveProfitDays = 0;
    } else {
        // Break-even resets both counters
        gameState.consecutiveProfitDays = 0;
        gameState.consecutiveLossDays = 0;
    }
    
    // Check achievements with sales data
    if (window.achievementManager) {
        const salesData = {
            bottlesSold: bottlesSold,
            dayProfit: profit,
            totalBottles: totalBottles,
            riverWaterSold: riverWaterSold,
            filteredWaterSold: filteredWaterSold
        };
        window.achievementManager.checkSalesAchievements(gameState, salesData);
    }
    
    gameState.currentStep = GameStep.DAY_RESULTS;
    await showDayResults(bottlesSold, revenue, profit, totalBottles);
}
async function showDayResults(bottlesSold, revenue, profit, totalBottles) {
    await typewriterText("=== End of Day Results ===", 40);
    await typewriterText(`Bottles sold: ${bottlesSold} out of ${totalBottles}`, 40);
    await typewriterText(`Revenue earned: ₹${revenue.toFixed(2)}`, 40);
    await typewriterText(`Total cost: ₹${gameState.totalCost.toFixed(2)}`, 40);
    // Create profit/loss display with colors
    const profitElement = document.createElement('div');
    profitElement.className = 'story-paragraph';
    if (profit > 0) {
        profitElement.innerHTML = `<span class="profit">✓ Profit: ₹${profit.toFixed(2)}</span>`;
    }
    else if (profit < 0) {
        profitElement.innerHTML = `<span class="loss">✗ Loss: ₹${Math.abs(profit).toFixed(2)}</span>`;
    }
    else {
        profitElement.innerHTML = `<span class="neutral">➤ Break-even: ₹0</span>`;
    }
    storyTextElement.appendChild(profitElement);
    await sleep(1000);
    await typewriterText(`Money in pocket: ₹${gameState.money.toFixed(2)}`, 40);
    await typewriterText(`Total profit so far: ₹${gameState.totalProfit.toFixed(2)}`, 40);
    
    const remainingBottles = gameState.inventory.riverWaterBottles + gameState.inventory.filteredWaterBottles;
    if (remainingBottles > 0) {
        await typewriterText(`Unsold bottles: ${remainingBottles}`, 40);
        await typewriterText(`(${gameState.inventory.riverWaterBottles} river water, ${gameState.inventory.filteredWaterBottles} filtered water)`, 30);
    }
    gameState.currentStep = GameStep.NEXT_DAY;
    await askNextDay();
}
async function askNextDay() {
    await sleep(2000);
    await typewriterText("Would you like to continue to the next day?", 40);
    
    // Only show the "kind savior" message for day 1 (going to day 2)
    if (gameState.day === 1) {
        await typewriterText("(You'll get some extra money from a kind savior + your current money)", 30);
    }
    
    showInput("Type 'yes' to continue or 'no' to end");
}
async function processNextDay(input) {
    const answer = input.toLowerCase().trim();
    if (answer === 'yes' || answer === 'y') {
        hideInput();
        clearStory();
        // Start new day
        gameState.day++;
        
        // Dynamic bonus money based on performance
        let bonusMoney = 0;
        let bonusMessage = '';
        
        if (gameState.consecutiveProfitDays >= 5) {
            // Stop giving money after 5 consecutive profitable days
            bonusMoney = 0;
            bonusMessage = 'You\'re doing well on your own now! No extra help today.';
        } else if (gameState.consecutiveLossDays >= 3) {
            // Increased help for struggling players
            bonusMoney = getRandomInt(20, 35);
            bonusMessage = `A concerned stranger sees your struggles and gives you ₹${bonusMoney} to help!`;
        } else if (gameState.consecutiveLossDays >= 1) {
            // Moderate help for some losses
            bonusMoney = getRandomInt(10, 20);
            bonusMessage = `A kind stranger gives you ₹${bonusMoney} to help with your business!`;
        } else {
            // Normal help
            bonusMoney = getRandomInt(3, 15);
            bonusMessage = `A kind stranger gives you ₹${bonusMoney} to help with your business!`;
        }
        
        gameState.money += bonusMoney;
        
        // Reset day-specific values but keep inventory
        gameState.bottlesBought = 0;
        gameState.sellingPrice = 0;
        gameState.waterType = '';
        gameState.totalCost = 0;
        
        await typewriterText(`=== Day ${gameState.day} ===`, 80);
        if (bonusMoney > 0) {
            await typewriterText(bonusMessage, 40);
        } else {
            await typewriterText(bonusMessage, 40);
        }
        // Show inventory status from Day 2 onwards
        if (gameState.day >= 2) {
            await showInventoryStatus();
        }
        gameState.currentStep = GameStep.BUY_BOTTLES;
        await askBuyBottles();
    }
    else if (answer === 'no' || answer === 'n') {
        hideInput();
        await endGame();
    }
    else {
        await typewriterText("Please type 'yes' or 'no'.", 40);
        showInput("Type 'yes' to continue or 'no' to end");
    }
}
async function endGame() {
    await typewriterText("=== Game Over ===", 80);
    await typewriterText(`You played for ${gameState.day} day(s).`, 40);
    await typewriterText(`Final money: ₹${gameState.money.toFixed(2)}`, 40);
    await typewriterText(`Total profit earned: ₹${gameState.totalProfit.toFixed(2)}`, 40);
    
    // Show achievement progress
    if (window.achievementManager) {
        const unlocked = window.achievementManager.getUnlockedCount();
        const total = window.achievementManager.getTotalCount();
        await typewriterText(`Achievements unlocked: ${unlocked}/${total}`, 40);
    }
    if (gameState.riverWaterUsage > 0) {
        await typewriterText(`You used river water ${gameState.riverWaterUsage} time(s). This may have affected your sales...`, 40);
    }
    if (gameState.reputationBonus > 0) {
        await typewriterText(`🌟 You built a quality reputation with ${gameState.reputationBonus}% sales bonus!`, 40);
    }
    const maxStreak = Math.max(gameState.consecutiveFilteredDays, gameState.consecutiveRiverDays);
    if (maxStreak >= 5) {
        const waterType = gameState.consecutiveFilteredDays > gameState.consecutiveRiverDays ? 'filtered' : 'river';
        await typewriterText(`Longest streak: ${maxStreak} days of ${waterType} water`, 40);
    }
    if (gameState.totalProfit > 0) {
        await typewriterText("Congratulations! You're a successful water bottle entrepreneur!", 40);
    }
    else if (gameState.totalProfit < 0) {
        await typewriterText("Better luck next time! Business can be tough.", 40);
    }
    else {
        await typewriterText("You broke even! Not bad for a beginner.", 40);
    }
    await sleep(3000);
    await typewriterText("Refresh the page to play again!", 40);
    await sleep(1000);
    
    // Add repository link
    const linkParagraph = document.createElement('div');
    linkParagraph.className = 'story-paragraph';
    linkParagraph.innerHTML = `Take a look at the repository: <a href="https://github.com/ChefYeshpal/webapp-moneymaker" target="_blank" style="color: #4CAF50; text-decoration: underline;">https://github.com/ChefYeshpal/webapp-moneymaker</a>`;
    storyTextElement.appendChild(linkParagraph);
}
// Event handlers
function handleSubmit() {
    const input = userInput.value.trim();
    if (!input)
        return;
    switch (gameState.currentStep) {
        case GameStep.BUY_BOTTLES:
            processBuyBottles(input);
            break;
        case GameStep.CHOOSE_WATER:
            processWaterChoice(input);
            break;
        case GameStep.SET_PRICE:
            processSellingPrice(input);
            break;
        case GameStep.NEXT_DAY:
            processNextDay(input);
            break;
    }
}
// Initialize game
function initGame() {
    storyTextElement = document.getElementById('story-text');
    inputSection = document.getElementById('input-section');
    userInput = document.getElementById('user-input');
    submitButton = document.getElementById('submit-button');
    animationToggle = document.getElementById('animation-toggle');
    
    // Load saved animation preference
    const savedInstantMode = localStorage.getItem('waterBottleTycoon_instantMode');
    if (savedInstantMode === 'true') {
        instantMode = true;
        const toggleIcon = animationToggle.querySelector('.toggle-icon');
        const toggleText = animationToggle.querySelector('.toggle-text');
        toggleIcon.textContent = '⏱️';
        toggleText.textContent = 'Step Mode';
        animationToggle.title = 'Switch to typewriter animation (word by word)';
    } else {
        animationToggle.title = 'Switch to step-by-step text (line by line)';
    }
    
    // Event listeners
    submitButton.addEventListener('click', handleSubmit);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    });
    
    // Animation toggle event listener
    animationToggle.addEventListener('click', toggleAnimationMode);
    
    // Right-click to skip typing animation
    document.addEventListener('contextmenu', (e) => {
        if (isTyping) {
            e.preventDefault(); // Prevent context menu from showing
            skipCurrentTyping();
        }
    });
    // Konami code setup
    const konamiSequence = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
    let konamiIndex = 0;
    
    // Combined keydown listener for both spacebar skip and Konami code
    document.addEventListener('keydown', (e) => {
        // Don't trigger Konami code while user is typing into input/textarea
        const targetTag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : null;
        const isTypingInInput = (targetTag === 'input' || targetTag === 'textarea');
        
        // Handle spacebar skip (only when not typing in input)
        if (isTyping && e.code === 'Space' && !isTypingInInput) {
            e.preventDefault(); // Prevent page scroll
            skipCurrentTyping();
            return; // Don't process Konami code for spacebar
        }
        
        // Handle Konami code (only when not typing in input)
        if (!isTypingInInput) {
            const key = e.key.toLowerCase();
            console.log(`easter.k debug: key="${key}", index=${konamiIndex}, expected="${konamiSequence[konamiIndex]}"`);
            
            if (key === konamiSequence[konamiIndex]) {
                konamiIndex++;
                console.log(`easter.k progress: ${konamiIndex}/${konamiSequence.length}`);
                if (konamiIndex === konamiSequence.length) {
                    // Full sequence entered — open link in new tab
                    console.log('easter.k code entered - opening in new tab...');
                    window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
                }
            }
            else {
                // If the current key matches the first sequence key, start at 1, otherwise reset
                konamiIndex = (key === konamiSequence[0]) ? 1 : 0;
                if (konamiIndex > 0) {
                    console.log(`easter.k reset but restarted: key="${key}" matches first key`);
                }
            }
        }
    });
    
    // Also allow left-click to skip (optional)
    document.addEventListener('click', (e) => {
        if (isTyping && e.target !== userInput && e.target !== submitButton && !animationToggle.contains(e.target)) {
            skipCurrentTyping();
        }
    });
    // Start the game
    startIntro();
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', initGame);

// Console Testing Functions for Reputation System
window.testReputation = {
    // Show current reputation status
    status: () => {
        console.log('\n=== REPUTATION STATUS ===');
        console.log(`Current Day: ${gameState.day}`);
        console.log(`Consecutive Filtered Days: ${gameState.consecutiveFilteredDays}`);
        console.log(`Consecutive River Days: ${gameState.consecutiveRiverDays}`);
        console.log(`Reputation Bonus: ${gameState.reputationBonus}%`);
        console.log(`Last Water Type: ${gameState.lastWaterType || 'none'}`);
        console.log(`River Water Usage Count: ${gameState.riverWaterUsage}`);
    },

    // Force trigger reputation notifications
    triggerNotifications: {
        positive: () => {
            gameState.consecutiveFilteredDays = 7;
            gameState.reputationBonus = 16;
            showReputationNotification('🌟', 'Quality Reputation Boost!', '+16% sales from 7 days of filtered water');
            console.log('🌟 Triggered positive reputation notification');
        },
        
        building: () => {
            gameState.consecutiveFilteredDays = 3;
            showReputationNotification('📈', 'Building Reputation...', '2 more filtered water days for sales boost');
            console.log('📈 Triggered building reputation notification');
        },
        
        declining: () => {
            gameState.consecutiveRiverDays = 2;
            gameState.reputationBonus = 14;
            showReputationNotification('📉', 'Reputation Declining', 'Lost 6% from river water (14% remaining)');
            console.log('📉 Triggered declining reputation notification');
        },

        all: () => {
            console.log('🧪 Testing all reputation notifications...');
            window.testReputation.triggerNotifications.positive();
            setTimeout(() => window.testReputation.triggerNotifications.building(), 1000);
            setTimeout(() => window.testReputation.triggerNotifications.declining(), 2000);
        }
    },

    // Set reputation state for testing
    setState: {
        // Set to almost ready for reputation bonus
        almostReady: () => {
            gameState.consecutiveFilteredDays = 4;
            gameState.consecutiveRiverDays = 0;
            gameState.reputationBonus = 0;
            gameState.lastWaterType = 'filtered';
            console.log('🔧 Set state: 1 day away from reputation bonus');
            window.testReputation.status();
        },

        // Set to high reputation
        highReputation: () => {
            gameState.consecutiveFilteredDays = 15;
            gameState.consecutiveRiverDays = 0;
            gameState.reputationBonus = 22;
            gameState.lastWaterType = 'filtered';
            console.log('🔧 Set state: High reputation (22% bonus)');
            window.testReputation.status();
        },

        // Set to declining reputation
        declining: () => {
            gameState.consecutiveFilteredDays = 0;
            gameState.consecutiveRiverDays = 3;
            gameState.reputationBonus = 8;
            gameState.lastWaterType = 'river';
            console.log('🔧 Set state: Declining reputation');
            window.testReputation.status();
        },

        // Reset reputation
        reset: () => {
            gameState.consecutiveFilteredDays = 0;
            gameState.consecutiveRiverDays = 0;
            gameState.reputationBonus = 0;
            gameState.lastWaterType = '';
            console.log('🔧 Reset reputation state');
            window.testReputation.status();
        }
    },

    // Test the reputation system with different water choices
    testWaterChoice: {
        filtered: () => {
            console.log('🧪 Testing filtered water choice...');
            updateReputation('filtered');
            showReputationStatus();
            window.testReputation.status();
        },

        river: () => {
            console.log('🧪 Testing river water choice...');
            updateReputation('river');
            showReputationStatus();
            window.testReputation.status();
        },

        // Simulate 5 days of filtered water to trigger reputation bonus
        fiveDaysFiltered: () => {
            console.log('🧪 Simulating 5 days of filtered water...');
            for (let i = 1; i <= 5; i++) {
                updateReputation('filtered');
                console.log(`Day ${i}: Consecutive filtered days: ${gameState.consecutiveFilteredDays}, Bonus: ${gameState.reputationBonus}%`);
            }
            showReputationStatus();
        },

        // Simulate reputation decline
        reputationDecline: () => {
            console.log('🧪 Simulating reputation decline...');
            // First build up reputation
            window.testReputation.setState.highReputation();
            // Then use river water for 3 days
            for (let i = 1; i <= 3; i++) {
                updateReputation('river');
                console.log(`River day ${i}: Consecutive river days: ${gameState.consecutiveRiverDays}, Bonus: ${gameState.reputationBonus}%`);
            }
            showReputationStatus();
        }
    },

    // Show help
    help: () => {
        console.log('\n=== REPUTATION TESTING HELP ===');
        console.log('window.testReputation.status() - Show current reputation status');
        console.log('window.testReputation.triggerNotifications.positive() - Show positive notification');
        console.log('window.testReputation.triggerNotifications.building() - Show building notification');
        console.log('window.testReputation.triggerNotifications.declining() - Show declining notification');
        console.log('window.testReputation.triggerNotifications.all() - Show all notifications');
        console.log('window.testReputation.setState.almostReady() - Set to 1 day from bonus');
        console.log('window.testReputation.setState.highReputation() - Set high reputation');
        console.log('window.testReputation.setState.declining() - Set declining reputation');
        console.log('window.testReputation.setState.reset() - Reset reputation');
        console.log('window.testReputation.testWaterChoice.filtered() - Test filtered water');
        console.log('window.testReputation.testWaterChoice.river() - Test river water');
        console.log('window.testReputation.testWaterChoice.fiveDaysFiltered() - Simulate 5 day buildup');
        console.log('window.testReputation.testWaterChoice.reputationDecline() - Simulate decline');
        console.log('window.testReputation.help() - Show this help');
    }
};

// Console Testing Functions for Price Consistency System
window.testPricing = {
    // Show current price consistency status
    status: () => {
        console.log('\n=== PRICE CONSISTENCY STATUS ===');
        console.log(`Current Day: ${gameState.day}`);
        console.log(`Current Price: ₹${gameState.sellingPrice}`);
        console.log(`Last Price: ₹${gameState.lastPrice}`);
        console.log(`Consecutive Same Price Days: ${gameState.consecutiveSamePriceDays}`);
        console.log(`Price Consistency Bonus: ${gameState.priceConsistencyBonus}%`);
        console.log(`Total Price Changes: ${gameState.priceChanges}`);
        console.log(`Recent Price Changes: ${gameState.recentPriceChanges.length}`);
        if (gameState.recentPriceChanges.length > 0) {
            console.log(`Recent Changes:`, gameState.recentPriceChanges);
        }
        const penalty = calculateFluctuationPenalty();
        console.log(`Current Fluctuation Penalty: ${penalty.toFixed(1)}%`);
    },

    // Test price consistency scenarios
    simulate: {
        // Simulate consistent pricing for bonus
        consistentPricing: (price = 3, days = 15) => {
            console.log(`🧪 Simulating ${days} days of consistent ₹${price} pricing...`);
            gameState.lastPrice = 0; // Reset
            gameState.consecutiveSamePriceDays = 0;
            gameState.priceConsistencyBonus = 0;
            
            for (let i = 1; i <= days; i++) {
                gameState.day = i;
                updatePriceConsistency(price);
            }
            window.testPricing.status();
        },

        // Simulate price fluctuations
        fluctuatingPrices: () => {
            console.log('🧪 Simulating fluctuating prices...');
            const prices = [3, 4, 2.5, 5, 3.5, 2, 4.5, 3, 6, 2.5];
            gameState.lastPrice = 0; // Reset
            gameState.consecutiveSamePriceDays = 0;
            gameState.priceConsistencyBonus = 0;
            gameState.priceChanges = 0;
            gameState.recentPriceChanges = [];
            
            for (let i = 0; i < prices.length; i++) {
                gameState.day = i + 1;
                updatePriceConsistency(prices[i]);
            }
            window.testPricing.status();
        },

        // Simulate mixed scenario
        mixedScenario: () => {
            console.log('🧪 Simulating mixed pricing scenario...');
            // 5 days consistent, then fluctuations, then consistent again
            const prices = [3, 3, 3, 3, 3, 4, 2.5, 5, 3, 3, 3, 3, 3, 3, 3];
            gameState.lastPrice = 0; // Reset
            gameState.consecutiveSamePriceDays = 0;
            gameState.priceConsistencyBonus = 0;
            gameState.priceChanges = 0;
            gameState.recentPriceChanges = [];
            
            for (let i = 0; i < prices.length; i++) {
                gameState.day = i + 1;
                updatePriceConsistency(prices[i]);
                if (i === 4) console.log('📊 After 5 consistent days:');
                if (i === 7) console.log('📊 After fluctuations:');
                if (i === 14) console.log('📊 After returning to consistency:');
            }
            window.testPricing.status();
        }
    },

    // Test different bonus levels
    testBonus: {
        level1: () => {
            console.log('🧪 Testing 20% bonus (5 days)...');
            window.testPricing.simulate.consistentPricing(3, 5);
        },
        level2: () => {
            console.log('🧪 Testing 40% bonus (10 days)...');
            window.testPricing.simulate.consistentPricing(3, 10);
        },
        level3: () => {
            console.log('🧪 Testing 60% bonus (15 days)...');
            window.testPricing.simulate.consistentPricing(3, 15);
        },
        maxBonus: () => {
            console.log('🧪 Testing max 80% bonus (20+ days)...');
            window.testPricing.simulate.consistentPricing(3, 25);
        }
    },

    // Reset price tracking
    reset: () => {
        gameState.lastPrice = 0;
        gameState.consecutiveSamePriceDays = 0;
        gameState.priceConsistencyBonus = 0;
        gameState.priceChanges = 0;
        gameState.recentPriceChanges = [];
        console.log('🔧 Price tracking reset');
        window.testPricing.status();
    },

    // Show help
    help: () => {
        console.log('\n=== PRICE CONSISTENCY TESTING HELP ===');
        console.log('window.testPricing.status() - Show current price tracking status');
        console.log('window.testPricing.simulate.consistentPricing(price, days) - Simulate consistent pricing');
        console.log('window.testPricing.simulate.fluctuatingPrices() - Simulate price fluctuations');
        console.log('window.testPricing.simulate.mixedScenario() - Simulate mixed pricing scenario');
        console.log('window.testPricing.testBonus.level1() - Test 20% bonus (5 days)');
        console.log('window.testPricing.testBonus.level2() - Test 40% bonus (10 days)');
        console.log('window.testPricing.testBonus.level3() - Test 60% bonus (15 days)');
        console.log('window.testPricing.testBonus.maxBonus() - Test max 80% bonus (20+ days)');
        console.log('window.testPricing.reset() - Reset price tracking');
        console.log('window.testPricing.help() - Show this help');
    }
};
