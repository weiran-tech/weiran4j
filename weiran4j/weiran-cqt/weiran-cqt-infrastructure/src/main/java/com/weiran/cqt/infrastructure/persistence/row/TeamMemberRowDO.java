package com.weiran.cqt.infrastructure.persistence.row;

import lombok.Getter;
import lombok.Setter;
import org.jspecify.annotations.NullUnmarked;

/** 作品成员行。 */
@NullUnmarked
@Getter
@Setter
public class TeamMemberRowDO {

    private Long participantId;

    private String name;

    private String idCard;

    private String credentialType;

    private String phone;

    private String school;

    private String groupName;

    private Boolean leader;
}
