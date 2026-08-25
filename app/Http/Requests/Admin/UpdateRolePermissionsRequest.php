<?php

namespace App\Http\Requests\Admin;

use App\Permission;
use App\Support\PermissionRegistry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRolePermissionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::AssignPermissions->value) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'permissions' => ['present', 'array'],
            'permissions.*' => [
                'string',
                'distinct',
                Rule::in(PermissionRegistry::names()),
                Rule::exists('permissions', 'name')->where('guard_name', 'web'),
            ],
        ];
    }
}
