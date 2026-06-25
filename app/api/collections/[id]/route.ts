import { itemHandlers } from "@/lib/groupRoutes";

export const dynamic = "force-dynamic";

const handlers = itemHandlers("collection");
export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
