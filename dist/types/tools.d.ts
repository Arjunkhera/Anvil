import { z } from 'zod';
export declare const CreateNoteInputSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    content: z.ZodOptional<z.ZodString>;
    fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    use_template: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    type: string;
    title: string;
    fields?: Record<string, unknown> | undefined;
    content?: string | undefined;
    use_template?: boolean | undefined;
}, {
    type: string;
    title: string;
    fields?: Record<string, unknown> | undefined;
    content?: string | undefined;
    use_template?: boolean | undefined;
}>;
export declare const CreateNoteOutputSchema: z.ZodObject<{
    noteId: z.ZodString;
    filePath: z.ZodString;
    title: z.ZodString;
    type: z.ZodString;
}, "strip", z.ZodTypeAny, {
    noteId: string;
    type: string;
    title: string;
    filePath: string;
}, {
    noteId: string;
    type: string;
    title: string;
    filePath: string;
}>;
export declare const GetNoteInputSchema: z.ZodObject<{
    noteId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    noteId: string;
}, {
    noteId: string;
}>;
export declare const UpdateNoteInputSchema: z.ZodObject<{
    noteId: z.ZodString;
    fields: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    content: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    noteId: string;
    fields?: Record<string, unknown> | undefined;
    content?: string | undefined;
}, {
    noteId: string;
    fields?: Record<string, unknown> | undefined;
    content?: string | undefined;
}>;
export declare const UpdateNoteOutputSchema: z.ZodObject<{
    noteId: z.ZodString;
    updatedFields: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    noteId: string;
    updatedFields: string[];
}, {
    noteId: string;
    updatedFields: string[];
}>;
export declare const SearchInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    due: z.ZodOptional<z.ZodObject<{
        gte: z.ZodOptional<z.ZodString>;
        lte: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        gte?: string | undefined;
        lte?: string | undefined;
    }, {
        gte?: string | undefined;
        lte?: string | undefined;
    }>>;
    assignee: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodObject<{
        context: z.ZodOptional<z.ZodEnum<["personal", "work"]>>;
        team: z.ZodOptional<z.ZodString>;
        service: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        context?: "personal" | "work" | undefined;
        team?: string | undefined;
        service?: string | undefined;
    }, {
        context?: "personal" | "work" | undefined;
        team?: string | undefined;
        service?: string | undefined;
    }>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    type?: string | undefined;
    tags?: string[] | undefined;
    status?: string | undefined;
    query?: string | undefined;
    priority?: string | undefined;
    due?: {
        gte?: string | undefined;
        lte?: string | undefined;
    } | undefined;
    assignee?: string | undefined;
    project?: string | undefined;
    scope?: {
        context?: "personal" | "work" | undefined;
        team?: string | undefined;
        service?: string | undefined;
    } | undefined;
}, {
    type?: string | undefined;
    tags?: string[] | undefined;
    status?: string | undefined;
    query?: string | undefined;
    priority?: string | undefined;
    due?: {
        gte?: string | undefined;
        lte?: string | undefined;
    } | undefined;
    assignee?: string | undefined;
    project?: string | undefined;
    scope?: {
        context?: "personal" | "work" | undefined;
        team?: string | undefined;
        service?: string | undefined;
    } | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const QueryViewInputSchema: z.ZodObject<{
    view: z.ZodEnum<["list", "table", "board"]>;
    filters: z.ZodOptional<z.ZodObject<{
        query: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        due: z.ZodOptional<z.ZodObject<{
            gte: z.ZodOptional<z.ZodString>;
            lte: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            gte?: string | undefined;
            lte?: string | undefined;
        }, {
            gte?: string | undefined;
            lte?: string | undefined;
        }>>;
        created: z.ZodOptional<z.ZodObject<{
            gte: z.ZodOptional<z.ZodString>;
            lte: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            gte?: string | undefined;
            lte?: string | undefined;
        }, {
            gte?: string | undefined;
            lte?: string | undefined;
        }>>;
        modified: z.ZodOptional<z.ZodObject<{
            gte: z.ZodOptional<z.ZodString>;
            lte: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            gte?: string | undefined;
            lte?: string | undefined;
        }, {
            gte?: string | undefined;
            lte?: string | undefined;
        }>>;
        assignee: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodObject<{
            context: z.ZodOptional<z.ZodEnum<["personal", "work"]>>;
            team: z.ZodOptional<z.ZodString>;
            service: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        }, {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        }>>;
        archived: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        type?: string | undefined;
        tags?: string[] | undefined;
        status?: string | undefined;
        query?: string | undefined;
        priority?: string | undefined;
        due?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        created?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        modified?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        assignee?: string | undefined;
        project?: string | undefined;
        scope?: {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        } | undefined;
        archived?: boolean | undefined;
    }, {
        type?: string | undefined;
        tags?: string[] | undefined;
        status?: string | undefined;
        query?: string | undefined;
        priority?: string | undefined;
        due?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        created?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        modified?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        assignee?: string | undefined;
        project?: string | undefined;
        scope?: {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        } | undefined;
        archived?: boolean | undefined;
    }>>;
    groupBy: z.ZodOptional<z.ZodString>;
    orderBy: z.ZodOptional<z.ZodObject<{
        field: z.ZodString;
        direction: z.ZodEnum<["asc", "desc"]>;
    }, "strip", z.ZodTypeAny, {
        field: string;
        direction: "asc" | "desc";
    }, {
        field: string;
        direction: "asc" | "desc";
    }>>;
    columns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    view: "list" | "table" | "board";
    filters?: {
        type?: string | undefined;
        tags?: string[] | undefined;
        status?: string | undefined;
        query?: string | undefined;
        priority?: string | undefined;
        due?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        created?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        modified?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        assignee?: string | undefined;
        project?: string | undefined;
        scope?: {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        } | undefined;
        archived?: boolean | undefined;
    } | undefined;
    groupBy?: string | undefined;
    orderBy?: {
        field: string;
        direction: "asc" | "desc";
    } | undefined;
    columns?: string[] | undefined;
}, {
    view: "list" | "table" | "board";
    limit?: number | undefined;
    offset?: number | undefined;
    filters?: {
        type?: string | undefined;
        tags?: string[] | undefined;
        status?: string | undefined;
        query?: string | undefined;
        priority?: string | undefined;
        due?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        created?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        modified?: {
            gte?: string | undefined;
            lte?: string | undefined;
        } | undefined;
        assignee?: string | undefined;
        project?: string | undefined;
        scope?: {
            context?: "personal" | "work" | undefined;
            team?: string | undefined;
            service?: string | undefined;
        } | undefined;
        archived?: boolean | undefined;
    } | undefined;
    groupBy?: string | undefined;
    orderBy?: {
        field: string;
        direction: "asc" | "desc";
    } | undefined;
    columns?: string[] | undefined;
}>;
export declare const ListTypesInputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const GetRelatedInputSchema: z.ZodObject<{
    noteId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    noteId: string;
}, {
    noteId: string;
}>;
export declare const SyncPullInputSchema: z.ZodObject<{
    remote: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    branch: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    remote?: string | undefined;
    branch?: string | undefined;
}, {
    remote?: string | undefined;
    branch?: string | undefined;
}>;
export declare const SyncPushInputSchema: z.ZodObject<{
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
}, {
    message: string;
}>;
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;
export type CreateNoteOutput = z.infer<typeof CreateNoteOutputSchema>;
export type GetNoteInput = z.infer<typeof GetNoteInputSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>;
export type UpdateNoteOutput = z.infer<typeof UpdateNoteOutputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type QueryViewInput = z.infer<typeof QueryViewInputSchema>;
export type ListTypesInput = z.infer<typeof ListTypesInputSchema>;
export type GetRelatedInput = z.infer<typeof GetRelatedInputSchema>;
export type SyncPullInput = z.infer<typeof SyncPullInputSchema>;
export type SyncPushInput = z.infer<typeof SyncPushInputSchema>;
export declare const SyncPullOutputSchema: z.ZodUnion<[z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    filesChanged: z.ZodNumber;
    conflicts: z.ZodArray<z.ZodObject<{
        filePath: z.ZodString;
        type: z.ZodLiteral<"merge_conflict">;
    }, "strip", z.ZodTypeAny, {
        type: "merge_conflict";
        filePath: string;
    }, {
        type: "merge_conflict";
        filePath: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "ok";
    filesChanged: number;
    conflicts: {
        type: "merge_conflict";
        filePath: string;
    }[];
}, {
    status: "ok";
    filesChanged: number;
    conflicts: {
        type: "merge_conflict";
        filePath: string;
    }[];
}>, z.ZodObject<{
    status: z.ZodLiteral<"conflict">;
    conflicts: z.ZodArray<z.ZodObject<{
        filePath: z.ZodString;
        type: z.ZodLiteral<"merge_conflict">;
    }, "strip", z.ZodTypeAny, {
        type: "merge_conflict";
        filePath: string;
    }, {
        type: "merge_conflict";
        filePath: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "conflict";
    conflicts: {
        type: "merge_conflict";
        filePath: string;
    }[];
}, {
    status: "conflict";
    conflicts: {
        type: "merge_conflict";
        filePath: string;
    }[];
}>, z.ZodObject<{
    status: z.ZodLiteral<"no_changes">;
}, "strip", z.ZodTypeAny, {
    status: "no_changes";
}, {
    status: "no_changes";
}>]>;
export declare const SyncPushOutputSchema: z.ZodUnion<[z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    filesCommitted: z.ZodNumber;
    commitHash: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "ok";
    filesCommitted: number;
    commitHash: string;
}, {
    status: "ok";
    filesCommitted: number;
    commitHash: string;
}>, z.ZodObject<{
    status: z.ZodLiteral<"no_changes">;
}, "strip", z.ZodTypeAny, {
    status: "no_changes";
}, {
    status: "no_changes";
}>, z.ZodObject<{
    status: z.ZodLiteral<"push_failed">;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    status: "push_failed";
}, {
    message: string;
    status: "push_failed";
}>]>;
export type SyncPullOutput = z.infer<typeof SyncPullOutputSchema>;
export type SyncPushOutput = z.infer<typeof SyncPushOutputSchema>;
//# sourceMappingURL=tools.d.ts.map