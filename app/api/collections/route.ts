import { listHandlers } from "@/lib/groupRoutes";

export const dynamic = "force-dynamic";

const handlers = listHandlers("collection");
export const GET = handlers.GET;
export const POST = handlers.POST;
