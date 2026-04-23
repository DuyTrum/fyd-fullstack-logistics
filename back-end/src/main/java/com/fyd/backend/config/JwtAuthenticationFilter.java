package com.fyd.backend.config;

import com.fyd.backend.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String jwt = authHeader.substring(7).trim();
            
            if (jwtService.validateToken(jwt)) {
                Claims claims = jwtService.parseToken(jwt);
                String userIdSubject = claims.getSubject();
                
                Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
                boolean isAnonymous = currentAuth != null && 
                    (currentAuth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken || 
                     "anonymousUser".equals(currentAuth.getPrincipal()));

                if (userIdSubject != null && (currentAuth == null || isAnonymous)) {
                    List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                    
                    String role = claims.get("role", String.class);
                    if (role != null) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                    }
                    
                    Object permsObj = claims.get("permissions");
                    if (permsObj instanceof List) {
                        List<?> permsList = (List<?>) permsObj;
                        for (Object p : permsList) {
                            authorities.add(new SimpleGrantedAuthority(p.toString()));
                        }
                    }

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userIdSubject, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
