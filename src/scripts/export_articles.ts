import Crisp from "crisp-api";
import { supermemory } from "../config";
import { Logger } from "../logger";
import "dotenv/config";

// --- Configuration ---
const CRISP_IDENTIFIER = process.env.CRISP_IDENTIFIER || "";
const CRISP_KEY = process.env.CRISP_KEY || "";
const WEBSITE_ID = process.env.CRISP_WEBSITE_ID || "";

if (!CRISP_IDENTIFIER || !CRISP_KEY || !WEBSITE_ID) {
  console.error("❌ Missing Crisp credentials in .env");
  process.exit(1);
}

const crispClient = new Crisp();
crispClient.setTier("plugin");
crispClient.authenticate(CRISP_IDENTIFIER, CRISP_KEY);

/**
 * Helper to prevent rate limits
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Export Helpdesk Articles to Supermemory.
 */
async function exportArticlesToAI() {
  Logger.info(`📚 Starting FRESH Crisp Articles export...`);
  // Delay slightly to ensure .env is correctly picked up
  await sleep(1000);

  const locales = ["ru", "uz"]; 

  try {
    for (const locale of locales) {
      Logger.info(`🌐 Checking locale: ${locale}`);
      
      let page = 1;
      while (true) {
        // Delay to avoid rate limiting at the start of a page
        await sleep(2000);

        const articles = await crispClient.website.listHelpdeskLocaleArticles(WEBSITE_ID, locale, page);
        
        if (!articles || articles.length === 0) {
          Logger.info(`No more articles for ${locale}.`);
          break;
        }

        for (const art of articles) {
          // The API returns 'published' for visible articles
          if (art.status !== "published" && art.status !== "visible") {
            Logger.info(`   ⏭️ Skipping draft: ${art.title}`);
            continue;
          }

          await sleep(1000); // Respecting the new key's limits

          const articleId = art.article_id;
          Logger.info(`📄 Fetching article: ${art.title} (${articleId})`);

          try {
            const fullArticle = await crispClient.website.resolveHelpdeskLocaleArticle(WEBSITE_ID, locale, articleId);
            
            if (!fullArticle || !fullArticle.content) {
              Logger.info(`   ⚠️ No content found for ${art.title}`);
              continue;
            }

            const structuredDoc = `
# Company Documentation: "${fullArticle.title}"
**Locale**: ${locale}
**Last Updated**: ${new Date(fullArticle.updated_at || Date.now()).toLocaleString()}
**Description**: ${fullArticle.description || "No description"}

## Content:
${fullArticle.content}

---
*SOURCE: CRISP HELPDESK / OFFICIAL KNOWLEDGE BASE*
`.trim();

            await (supermemory as any).documents.add({
              content: structuredDoc,
            });
            Logger.info(`   ✅ Synchronized: ${art.title}`);
          } catch (err: any) {
            if (err.message.includes("rate_limited")) {
              Logger.info("🛑 RATE LIMITED. Waiting 60s...");
              await sleep(60000);
              // Simple continue: might skip this article or cause retry issues, 
              // but protects the script.
            } else {
              Logger.error(`   ❌ Error: ${err.message}`);
            }
          }
        }
        page++;
      }
    }

    Logger.info("🎉 Official Articles export complete!");
  } catch (err: any) {
    Logger.error(`Fatal error in articles export: ${err.message}`);
  }
}

exportArticlesToAI();
