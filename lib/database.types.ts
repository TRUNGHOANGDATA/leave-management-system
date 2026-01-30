export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            email_templates: {
                Row: {
                    body_html: string
                    description: string | null
                    id: string
                    name: string
                    slug: string
                    subject: string
                    updated_at: string | null
                    updated_by: string | null
                    variables: Json | null
                }
                Insert: {
                    body_html: string
                    description?: string | null
                    id?: string
                    name: string
                    slug: string
                    subject: string
                    updated_at?: string | null
                    updated_by?: string | null
                    variables?: Json | null
                }
                Update: {
                    body_html?: string
                    description?: string | null
                    id?: string
                    name?: string
                    slug?: string
                    subject?: string
                    updated_at?: string | null
                    updated_by?: string | null
                    variables?: Json | null
                }
                Relationships: [
                    {
                        foreignKeyName: "email_templates_updated_by_fkey"
                        columns: ["updated_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            leave_requests: {
                Row: {
                    approved_at: string | null
                    approved_by: string | null
                    created_at: string | null
                    duration: number
                    from_date: string
                    id: string
                    reason: string | null
                    request_details: Json | null
                    status: string
                    to_date: string
                    type: string
                    updated_at: string | null
                    user_id: string
                }
                Insert: {
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    duration: number
                    from_date: string
                    id?: string
                    reason?: string | null
                    request_details?: Json | null
                    status?: string
                    to_date: string
                    type: string
                    updated_at?: string | null
                    user_id: string
                }
                Update: {
                    approved_at?: string | null
                    approved_by?: string | null
                    created_at?: string | null
                    duration?: number
                    from_date?: string
                    id?: string
                    reason?: string | null
                    request_details?: Json | null
                    status?: string
                    to_date?: string
                    type?: string
                    updated_at?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "leave_requests_approved_by_fkey"
                        columns: ["approved_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "leave_requests_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            users: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    department: string | null
                    email: string
                    id: string
                    manager_id: string | null
                    name: string
                    role: string
                    updated_at: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    department?: string | null
                    email: string
                    id?: string
                    manager_id?: string | null
                    name: string
                    role?: string
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    department?: string | null
                    email?: string
                    id?: string
                    manager_id?: string | null
                    name?: string
                    role?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "users_manager_id_fkey"
                        columns: ["manager_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
