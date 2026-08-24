<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TaskSyncRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'operations' => ['required', 'array', 'min:1', 'max:100'],
            'operations.*' => ['required', 'array:id,type,title,description,completed,version'],
            'operations.*.id' => ['required', 'uuid', 'distinct'],
            'operations.*.type' => ['required', 'string', 'in:create,update,delete'],
            'operations.*.title' => ['required', 'string', 'max:255'],
            'operations.*.description' => ['nullable', 'string', 'max:2000'],
            'operations.*.completed' => ['required', 'boolean'],
            'operations.*.version' => ['required', 'integer', 'min:0'],
        ];
    }
}
