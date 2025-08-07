import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "../services/auth.service";
import { AuthLoginDto } from "../dto/auth/auth-login.dto";
import { AuthResponseDto } from "../dto/auth/auth-response.dto";

@Controller('api/auth')
export class AuthController {
    
    constructor(private readonly authService: AuthService) {}

    @Post("/login")
    create (@Body() authLoginDto : AuthLoginDto ) : Promise<AuthResponseDto>{
        return this.authService.login(authLoginDto);
    }

}