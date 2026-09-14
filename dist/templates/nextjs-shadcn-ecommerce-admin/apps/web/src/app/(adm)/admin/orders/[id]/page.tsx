import { notFound } from "next/navigation";

import {
	Article,
	ArticleContent,
	ArticleHeader,
	ArticleItem,
	ArticleTitle,
} from "@/components/article";
import { Price } from "@/lib/currency";
import { formatDate } from "@/lib/utils";
import { getOrderByIdQuery } from "@/modules/orders/actions";

/**
 * Read-only detail page — no `[id]/update/page.tsx` sibling exists for
 * this module (see `modules/orders/actions.ts`'s own header comment: no
 * update route exists on `apps/api` to back one). Status is displayed here
 * exactly as `apps/api` returns it; it is never editable from this page.
 */
export default async function AdminOrderDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const order = await getOrderByIdQuery(id);

	if (!order) notFound();

	return (
		<Article>
			<ArticleHeader>
				<ArticleTitle title={order.orderId} />
				<p className="text-muted-foreground text-sm">
					Created: {formatDate(order.createdAt)} · Last updated:{" "}
					{formatDate(order.updatedAt)}
				</p>
			</ArticleHeader>
			<ArticleContent className="grid gap-2 sm:grid-cols-2">
				<ArticleItem title="Status" description={order.status} />
				<ArticleItem
					title="dLocal ID"
					description={order.dlocalId ?? undefined}
				/>
				<ArticleItem title="Email" description={order.mail ?? undefined} />
				<ArticleItem title="Buyer name" description={order.buyerInfo?.name} />
				<ArticleItem title="Document" description={order.buyerInfo?.document} />
				<ArticleItem title="Phone" description={order.buyerInfo?.phone} />
			</ArticleContent>
			<div className="space-y-2">
				<h3 className="font-semibold">Items</h3>
				<ul className="space-y-1">
					{order.buyerProducts.map((item) => (
						<li
							key={item.productId}
							className="flex items-center justify-between text-sm"
						>
							<span>
								{item.slug} × {item.quantity}
							</span>
							<Price price={item.lineTotal} />
						</li>
					))}
				</ul>
			</div>
		</Article>
	);
}
