package com.example.websport.entity;

import com.example.websport.common.EnumRole;
import com.example.websport.common.EnumStatus;
import jakarta.persistence.*;
import lombok.*;

import javax.management.relation.RoleStatus;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "users")
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_name")
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "full_name")
    private String fullname;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private EnumStatus status;

    @Column(name = "role")
    @Enumerated(EnumType.STRING)
    private EnumRole role;
}
