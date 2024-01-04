/* * * * * * * * * * * * * * * *
 *                             *
 *       Image Scraper         *
 *       Author: 7teen         *
 *        Remaked By:          *
 *     uno // grahgrahpoww     *
 *                             *
 *    Discord: grahgrahpoww    *
 *                             *
 * * * * * * * * * * * * * * * */

const { token, channel_id_to_fetch, webHook_id, webHook_token } = require("./settings.json");
const { greenBright, red, grey, yellowBright } = require("chalk");
const { WebhookClient } = require("discord.js");
const ora = require("ora");
const fs = require("fs");
const fetch = require("node-fetch");
const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
const { execSync } = require("child_process");

execSync("cls & title Image Scraper Remake by Uno & mode 53,30");

function clearConsole() {
    console.clear();
}

function showBanner() {
    console.log(`
    ██╗   ██╗██╗   ██╗██╗  ██╗███████╗██╗  ██╗
    ██║   ██║██║   ██║██║ ██╔╝██╔════╝██║  ██║
    ██║   ██║██║   ██║█████╔╝ ███████╗███████║
    ██║   ██║██║   ██║██╔═██╗ ╚════██║██╔══██║
    ╚██████╔╝╚██████╔╝██║  ██╗███████║██║  ██║
     ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝

      7Teen Image scraper remaked by Uno :)
    `);
}

function createDataFolder() {
    if (!fs.existsSync("./data")) {
        fs.mkdirSync("./data");
    }
}
async function request(before) {
    const options = {
        method: "GET",
        headers: {
            Authorization: token,
            Accept: 'application/json',
        },
    };

    const url = `https://discord.com/api/channels/${channel_id_to_fetch}/messages?limit=100&${before ? "before=" + before : ""}`;
    const response = await fetch(url, options);
    return await response.json();
}

async function getAllMessages() {
    let page = await request();
    let result = page;

    while (page.length >= 100) {
        page = await request(page[page.length - 1].id);
        result = result.concat(page);
    }

    return result;
}

function loadPostedItems() {
    try {
        const data = fs.readFileSync("./data/posted.json");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

async function getAllAttachments() {
    const messages = await getAllMessages();
    const attachments = messages
        .map((msg) => msg.attachments)
        .flat()
        .map((attachment) => attachment.proxy_url);

    return attachments.filter((attachment) => attachment);
}

function saveToFile(fileName, data) {
    fs.writeFileSync(`./data/${fileName}`, JSON.stringify(data, null, 2));
}
async function scrapeAndSave() {
    clearConsole();
    showBanner();
    const spinnerScrape = ora("Scraping attachments").start();

    try {
        const allAttachments = await getAllAttachments();
        const uniqueAttachments = [...new Set(allAttachments)]; // Remove duplicates

        createDataFolder();
        saveToFile("links.json", uniqueAttachments);

        spinnerScrape.succeed(`Scraped and saved ${uniqueAttachments.length} attachments.`);
        
        return uniqueAttachments;
    } catch (error) {
        spinnerScrape.fail(`Error scraping attachments: ${error}`);
        return [];
    }
}

function savePostedLinks(links) {
    saveToFile("posted.json", links);
}

async function postLinks(links) {
    const webhookCli = new WebhookClient(webHook_id, webHook_token);
    const spinnerPost = ora("Preparing to post").start();
    const postedLinks = loadPostedItems();

    for (let index = 0; index < links.length; index++) {
        const link = links[index];

        // Check if link has already been posted
        if (!postedLinks.includes(link)) {
            try {
                const msg = await webhookCli.send(link);
                spinnerPost.succeed(greenBright(`[${index}] Link Posted: ${yellowBright(msg.content)}`));
                postedLinks.push(link); // Add the link to posted links
            } catch (err) {
                spinnerPost.fail(red(`[${index}] Link failed to post | ${err}`));
            }
        } else {
            spinnerPost.warn(yellowBright(`[${index}] Link already posted: ${link}`));
        }
    }

    savePostedLinks(postedLinks);
    console.log(greenBright("Sended Success!"));
    process.exit(0);
}


function askToPost(links) {
    readline.question(grey("\n[?] Do you wish to post these links? (Y/N) "), (answr) => {
        if (answr === "Y" || answr === "y" || answr === "Yes" || answr === "yes" || answr === "YES") {
            postLinks(links);
        } else if (answr === "N" || answr === "n" || answr === "No" || answr === "no" || answr === "NO") {
            process.exit(1);
        } else {
            console.log(red("Invalid input. Please enter 'Y' or 'N'."));
            process.exit(1);
        }
    });
}

async function scrapeAndPost() {
    const links = await scrapeAndSave();
    if (links.length > 0) {
        askToPost(links);
    } else {
        console.log(red("No links to post."));
        process.exit(1);
    }
}

scrapeAndPost();

