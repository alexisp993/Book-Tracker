import { listHandlers } from "@/lib/groupRoutes";

export const dynamic = "force-dynamic";

const handlers = listHandlers("shelf");
export const GET = handlers.GET;
export const POST = handlers.POST;
