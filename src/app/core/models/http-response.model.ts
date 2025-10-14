export interface HttpResponseModel<T = any> {
    success: boolean;
    message?: string;
    statusCode: number;
    data?: T | null;
}

// Alias to match BE naming in code
export type ApiResponse<T = any> = HttpResponseModel<T>;