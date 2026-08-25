<?php

namespace App;

enum Permission: string
{
    case ViewDashboard = 'view.dashboard';
    case ViewTasks = 'view.tasks';
    case CreateTasks = 'create.tasks';
    case UpdateTasks = 'update.tasks';
    case DeleteTasks = 'delete.tasks';
    case ViewUsers = 'view.users';
    case CreateUsers = 'create.users';
    case UpdateUsers = 'update.users';
    case DeleteUsers = 'delete.users';
    case AssignRoles = 'assign.roles';
    case AssignAdministrator = 'assign.administrator';
    case ViewRoles = 'view.roles';
    case CreateRoles = 'create.roles';
    case UpdateRoles = 'update.roles';
    case DeleteRoles = 'delete.roles';
    case AssignPermissions = 'assign.permissions';
    case ViewSettings = 'view.settings';
    case ManageBranding = 'manage.branding';
}
