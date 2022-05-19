set(LIBRARY_NAME "tree-sitter-c")

set(Header_Files "tree_sitter/parser.h")
source_group("Header Files" FILES "${Header_Files}")

set(Source_Files "parser.c")
source_group("Header Files" FILES "${Header_Files}")

add_library("${LIBRARY_NAME}" "${Header_Files}" "${Source_Files}")

target_link_libraries("${LIBRARY_NAME}" PRIVATE "${PROJECT_NAME}_compiler_flags")

include(GNUInstallDirs)
target_include_directories(
        "${LIBRARY_NAME}"
        PUBLIC
        "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>"
        "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)

#=========#
# Install #
#=========#

# setup the version numbering
set_property(TARGET "${LIBRARY_NAME}" PROPERTY VERSION "${${PROJECT_NAME}_VERSION}")
set_property(TARGET "${LIBRARY_NAME}" PROPERTY SOVERSION "${${PROJECT_NAME}_VERSION_MAJOR}")

install(FILES ${Header_Files}
        DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}/${PROJECT_NAME}")

#====================#
# Package to install #
#====================#

set(installable_libs "${LIBRARY_NAME}" "${PROJECT_NAME}_compiler_flags")
if (TARGET "${DEPENDANT_LIBRARY}")
    list(APPEND installable_libs "${DEPENDANT_LIBRARY}")
endif ()
install(TARGETS ${installable_libs}
        EXPORT "${LIBRARY_NAME}Targets"
        ARCHIVE DESTINATION "${CMAKE_INSTALL_LIBDIR}"
        LIBRARY DESTINATION "${CMAKE_INSTALL_LIBDIR}"
        RUNTIME DESTINATION "${CMAKE_INSTALL_BINDIR}")
install(EXPORT "${LIBRARY_NAME}Targets"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/${PROJECT_NAME}")
