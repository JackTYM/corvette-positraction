ALTER POLICY "item_documents_select_shared" ON "item_documents" TO anonymous USING (public.is_share_enabled("item_documents"."user_id"));--> statement-breakpoint
ALTER POLICY "item_links_select_shared" ON "item_links" TO anonymous USING (public.is_share_enabled("item_links"."user_id"));--> statement-breakpoint
ALTER POLICY "items_select_shared" ON "items" TO anonymous USING (public.is_share_enabled("items"."user_id"));--> statement-breakpoint
ALTER POLICY "wishlist_items_select_shared" ON "wishlist_items" TO anonymous USING (public.is_share_enabled("wishlist_items"."user_id"));