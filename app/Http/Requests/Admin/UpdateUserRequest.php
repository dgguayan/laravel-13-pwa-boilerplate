<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Permission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can(Permission::UpdateUsers->value) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var User $managedUser */
        $managedUser = $this->route('user');
        $mayAssignRoles = $this->user()?->can(Permission::AssignRoles->value) === true;

        return [
            ...$this->profileRules($managedUser->id),
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'is_active' => ['required', 'boolean'],
            'roles' => [$mayAssignRoles ? 'sometimes' : 'prohibited', 'array'],
            'roles.*' => [
                'string',
                'distinct',
                Rule::exists('roles', 'name')->where('guard_name', 'web'),
            ],
        ];
    }
}
