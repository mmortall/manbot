import { chromium } from "playwright";
import TurndownService from "turndown";
import { URL } from "node:url";

async function main() {
    const args = process.argv.slice(2);
    const dumpMode = args.includes("-dump");
    const urlArg = args.find(arg => arg.startsWith("http"));

    if (!urlArg) {
        console.error("Usage: lynx -dump <url>");
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(urlArg, { waitUntil: "networkidle", timeout: 30000 });

        const html = await page.content();
        const turndown = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced",
        });

        // Custom rule to handle links and collect them for the "References" section
        const links: string[] = [];
        turndown.addRule('links', {
            filter: 'a',
            replacement: function (content, node) {
                const href = (node as Element).getAttribute('href');
                if (href && content.trim()) {
                    try {
                        const absoluteUrl = new URL(href, urlArg).href;
                        const index = links.length + 1;
                        links.push(absoluteUrl);
                        return `${content} [${index}]`;
                    } catch (e) {
                        return content;
                    }
                }
                return content;
            }
        });

        const markdown = turndown.turndown(html);

        if (dumpMode) {
            console.log(markdown);
            console.log("\nReferences\n");
            links.forEach((link, i) => {
                console.log(`   ${i + 1}. ${link}`);
            });
        } else {
            // Basic fallback for non-dump mode (though skills primarily use -dump)
            console.log(markdown);
        }
    } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

main();
