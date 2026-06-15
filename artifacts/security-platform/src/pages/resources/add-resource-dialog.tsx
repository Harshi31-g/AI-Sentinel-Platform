import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateResource, getListResourcesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  resourceName: z.string().min(1, "Resource name is required"),
  webhookId: z.string().min(1, "Webhook ID is required"),
  userId: z.string().min(1, "User ID is required"),
  encryptionKey: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddResourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const createResource = useCreateResource();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountName: "",
      resourceName: "",
      webhookId: "",
      userId: "",
      encryptionKey: "",
      description: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    createResource.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
          toast.success("Resource created successfully");
          onOpenChange(false);
          form.reset();
        },
        onError: () => {
          toast.error("Failed to create resource");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add AI Resource</DialogTitle>
          <DialogDescription>
            Register a new AI agent for continuous security scanning.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input placeholder="acme-corp" className="bg-muted/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="resourceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Name</FormLabel>
                    <FormControl>
                      <Input placeholder="customer-support-bot" className="bg-muted/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="webhookId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook ID</FormLabel>
                  <FormControl>
                    <Input placeholder="wh_..." className="bg-muted/50 font-mono text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="usr_..." className="bg-muted/50 font-mono text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="encryptionKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encryption Key (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-muted/50 font-mono text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Brief description of this agent's purpose..." className="bg-muted/50 resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={createResource.isPending}>
                {createResource.isPending && <Spinner className="mr-2 h-4 w-4" />}
                Add Resource
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}