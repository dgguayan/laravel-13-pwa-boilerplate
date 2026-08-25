<?php

namespace App\Http\Requests\Admin;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::CreateUsers->value) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $mayAssignRoles = $this->user()?->can(Permission::AssignRoles->value) === true;

        return [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'is_active' => ['sometimes', 'boolean'],
            'roles' => [$mayAssignRoles ? 'sometimes' : 'prohibited', 'array'],
            'roles.*' => [
                'string',
                'distinct',
                Rule::exists('roles', 'name')->where('guard_name', 'web'),
            ],
        ];
    }
}
