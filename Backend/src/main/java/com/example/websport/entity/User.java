package com.example.websport.entity;

import com.example.websport.common.EnumRole;
import com.example.websport.common.EnumStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import javax.management.relation.RoleStatus;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "users")
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
    private EnumStatus status;

    @Column(name = "role")
    private EnumRole role;
}
