import {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  moveSessionsToCollection,
  AuthError,
  type Collection,
} from "../api/client.js";
import { isAuthenticated } from "../utils/config.js";
import { logger, styles } from "../utils/logger.js";

function printCollection(c: Collection, indent = 0) {
  const pad = "  ".repeat(indent);
  logger.log(`${pad}${styles.key(c.collectionId)}`);
  logger.dim(`${pad}  Name: ${c.name}`);
  if (c.parentCollectionId) logger.dim(`${pad}  Parent: ${c.parentCollectionId}`);
  if (c.collectionData?.desc) logger.dim(`${pad}  Desc: ${c.collectionData.desc}`);
  logger.dim(`${pad}  Created: ${c.created}`);
  logger.break();
}

async function requireAuth() {
  if (!(await isAuthenticated())) {
    logger.error("Not authenticated. Run 'lilys login' first.");
    process.exit(1);
  }
}

export async function collectionsList(options: { json?: boolean } = {}) {
  await requireAuth();
  logger.info("Fetching collections...");

  try {
    const collections = await listCollections();

    if (options.json) {
      console.log(JSON.stringify(collections, null, 2));
      return;
    }

    if (collections.length === 0) {
      logger.warn("No collections found.");
      return;
    }

    logger.break();
    logger.log(`${logger.bold("Found")} ${styles.value(String(collections.length))} ${logger.bold("collection(s):")}`);
    logger.break();

    // Build parent-child tree
    const roots: Collection[] = [];
    const childMap = new Map<string, Collection[]>();

    for (const c of collections) {
      if (!c.parentCollectionId) {
        roots.push(c);
      } else {
        const siblings = childMap.get(c.parentCollectionId) || [];
        siblings.push(c);
        childMap.set(c.parentCollectionId, siblings);
      }
    }

    function printTree(items: Collection[], depth: number) {
      for (const item of items) {
        printCollection(item, depth);
        const children = childMap.get(item.collectionId);
        if (children) printTree(children, depth + 1);
      }
    }

    printTree(roots, 0);
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function collectionsCreate(name: string, options: { parent?: string } = {}) {
  await requireAuth();
  logger.info(`Creating collection: ${styles.value(name)}`);

  try {
    const result = await createCollection(name, options.parent);
    const id = result.collectionId || result.collection?.collectionId;
    logger.success(`Collection created${id ? `: ${styles.key(id)}` : ""}`);
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function collectionsRename(collectionId: string, newName: string) {
  await requireAuth();
  logger.info(`Renaming collection ${styles.key(collectionId)} to ${styles.value(newName)}`);

  try {
    await updateCollection(collectionId, newName);
    logger.success("Collection renamed.");
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function collectionsDelete(collectionId: string) {
  await requireAuth();
  logger.info(`Deleting collection: ${styles.key(collectionId)}`);

  try {
    await deleteCollection(collectionId);
    logger.success("Collection deleted.");
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function collectionsMove(collectionId: string, sids: string[]) {
  await requireAuth();
  logger.info(`Moving ${styles.value(String(sids.length))} session(s) to collection ${styles.key(collectionId)}`);

  try {
    await moveSessionsToCollection(collectionId, sids);
    logger.success("Sessions moved.");
  } catch (error) {
    if (error instanceof AuthError) {
      logger.error(error.message);
      process.exit(1);
    }
    logger.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
